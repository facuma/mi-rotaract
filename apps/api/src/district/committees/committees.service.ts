import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommitteeStatus } from '@prisma/client';
import { CsvParserService } from '../../common/bulk/csv-parser.service';
import { BulkImportResult } from '../../common/bulk/bulk-result.types';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { UpdateCommitteeDto } from './dto/update-committee.dto';
import { AddCommitteeMemberDto } from './dto/add-member.dto';
import { CreateCommitteeObjectiveDto } from './dto/create-objective.dto';
import { UpdateCommitteeObjectiveDto } from './dto/update-objective.dto';
import { CreateCommitteeActivityDto } from './dto/create-activity.dto';
import { UpdateCommitteeActivityDto } from './dto/update-activity.dto';

@Injectable()
export class CommitteesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
  ) {}

  async findAll(status?: CommitteeStatus, coordinatorId?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (coordinatorId) where.coordinatorId = coordinatorId;
    return this.prisma.committee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
        districtPeriod: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const committee = await this.prisma.committee.findUnique({
      where: { id },
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
        districtPeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
        members: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
        objectives: { orderBy: { order: 'asc' } },
        activities: { orderBy: { date: 'desc' } },
      },
    });
    if (!committee) throw new NotFoundException('Comité no encontrado');
    return committee;
  }

  async create(dto: CreateCommitteeDto) {
    await this.prisma.user.findUniqueOrThrow({
      where: { id: dto.coordinatorId },
    });
    return this.prisma.committee.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        coordinatorId: dto.coordinatorId,
        status: dto.status ?? CommitteeStatus.ACTIVE,
        districtPeriodId: dto.districtPeriodId || null,
      },
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCommitteeDto) {
    await this.findOne(id);
    if (dto.coordinatorId) {
      await this.prisma.user.findUniqueOrThrow({
        where: { id: dto.coordinatorId },
      });
    }
    return this.prisma.committee.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.coordinatorId != null && { coordinatorId: dto.coordinatorId }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.districtPeriodId !== undefined && { districtPeriodId: dto.districtPeriodId || null }),
      },
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.committee.delete({ where: { id } });
  }

  async getMembersBulkTemplate(committeeId: string): Promise<{ buffer: Buffer; filename: string }> {
    await this.findOne(committeeId);
    const header = ['email', 'role'];
    const example = ['usuario@club.org', 'integrante'];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-integrantes-comite.csv' };
  }

  async bulkImportMembers(
    committeeId: string,
    file: Express.Multer.File | undefined,
    mode: 'partial' | 'strict' = 'partial',
  ): Promise<BulkImportResult> {
    await this.findOne(committeeId);
    if (!file?.buffer) {
      throw new BadRequestException('Archivo CSV requerido');
    }

    const rows = this.csvParser.parse(file.buffer);
    const result: BulkImportResult = {
      total: rows.length,
      created: 0,
      failed: 0,
      mode,
      createdIds: [],
      errors: [],
    };

    const headerCols = ['email', 'role'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const email = row.email?.trim()?.toLowerCase();
      if (!email) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: 'Email obligatorio',
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importación abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      const user = await this.prisma.user.findUnique({
        where: { email, isActive: true },
      });
      if (!user) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: `Usuario no encontrado: ${row.email}`,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importación abortada: usuario no encontrado',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        const role = row.role?.trim() || null;
        await this.prisma.committeeMember.upsert({
          where: {
            committeeId_userId: { committeeId, userId: user.id },
          },
          create: { committeeId, userId: user.id, role },
          update: { role },
        });
        result.created++;
        result.createdIds!.push(user.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: msg,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: `Importación abortada: ${msg}`,
            });
            result.failed++;
          }
          return result;
        }
      }
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(headerCols, result.errors);
    }

    return result;
  }

  async addMember(committeeId: string, dto: AddCommitteeMemberDto) {
    await this.findOne(committeeId);
    const existing = await this.prisma.committeeMember.findUnique({
      where: {
        committeeId_userId: { committeeId, userId: dto.userId },
      },
    });
    if (existing) throw new ConflictException('El usuario ya es integrante del comité');
    return this.prisma.committeeMember.create({
      data: {
        committeeId,
        userId: dto.userId,
        role: dto.role?.trim() || null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async removeMember(committeeId: string, userId: string) {
    await this.findOne(committeeId);
    const member = await this.prisma.committeeMember.findUnique({
      where: {
        committeeId_userId: { committeeId, userId },
      },
    });
    if (!member) throw new NotFoundException('Integrante no encontrado');
    return this.prisma.committeeMember.delete({
      where: { id: member.id },
    });
  }

  async createObjective(committeeId: string, dto: CreateCommitteeObjectiveDto) {
    await this.findOne(committeeId);
    const maxOrder = await this.prisma.committeeObjective.aggregate({
      where: { committeeId },
      _max: { order: true },
    });
    const order = dto.order ?? (maxOrder._max.order ?? -1) + 1;
    return this.prisma.committeeObjective.create({
      data: {
        committeeId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        order,
      },
    });
  }

  async updateObjective(
    committeeId: string,
    objectiveId: string,
    dto: UpdateCommitteeObjectiveDto,
  ) {
    await this.findOne(committeeId);
    const obj = await this.prisma.committeeObjective.findFirst({
      where: { id: objectiveId, committeeId },
    });
    if (!obj) throw new NotFoundException('Objetivo no encontrado');
    return this.prisma.committeeObjective.update({
      where: { id: objectiveId },
      data: {
        ...(dto.title != null && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.order != null && { order: dto.order }),
      },
    });
  }

  async removeObjective(committeeId: string, objectiveId: string) {
    await this.findOne(committeeId);
    const obj = await this.prisma.committeeObjective.findFirst({
      where: { id: objectiveId, committeeId },
    });
    if (!obj) throw new NotFoundException('Objetivo no encontrado');
    return this.prisma.committeeObjective.delete({ where: { id: objectiveId } });
  }

  async createActivity(committeeId: string, dto: CreateCommitteeActivityDto) {
    await this.findOne(committeeId);
    return this.prisma.committeeActivity.create({
      data: {
        committeeId,
        title: dto.title.trim(),
        date: new Date(dto.date),
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateActivity(
    committeeId: string,
    activityId: string,
    dto: UpdateCommitteeActivityDto,
  ) {
    await this.findOne(committeeId);
    const act = await this.prisma.committeeActivity.findFirst({
      where: { id: activityId, committeeId },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.committeeActivity.update({
      where: { id: activityId },
      data: {
        ...(dto.title != null && { title: dto.title.trim() }),
        ...(dto.date != null && { date: new Date(dto.date) }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
    });
  }

  async removeActivity(committeeId: string, activityId: string) {
    await this.findOne(committeeId);
    const act = await this.prisma.committeeActivity.findFirst({
      where: { id: activityId, committeeId },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    return this.prisma.committeeActivity.delete({ where: { id: activityId } });
  }
}
