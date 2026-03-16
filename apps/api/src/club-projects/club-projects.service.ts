import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectCategory, ProjectStatus } from '@prisma/client';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProgressDto } from './dto/add-progress.dto';

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  IDEA: ['PLANIFICACION', 'CANCELADO'],
  PLANIFICACION: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
};

@Injectable()
export class ClubProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
  ) {}

  async findAll(clubId: string, status?: ProjectStatus) {
    const where: { clubId: string; status?: ProjectStatus } = { clubId };
    if (status) where.status = status;

    return this.prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        _count: { select: { progress: true } },
      },
    });
  }

  async findOne(id: string, clubId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        progress: { orderBy: { progressDate: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }
    return project;
  }

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = ['title', 'description', 'status', 'category', 'startDate', 'endDate'];
    const example = [
      'Proyecto social 2025',
      'Descripción breve',
      'IDEA',
      'SOCIAL',
      '2025-01-01',
      '2025-06-30',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-proyectos.csv' };
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val || val.trim() === '') return defaultVal;
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'sí' || v === 'si' || v === 'yes';
  }

  async bulkImport(
    clubId: string,
    file: Express.Multer.File | undefined,
    actorUserId: string,
    mode: 'partial' | 'strict' = 'partial',
  ): Promise<BulkImportResult> {
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

    const headerCols = ['title', 'description', 'status', 'category', 'startDate', 'endDate'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const dto = plainToInstance(CreateProjectDto, {
        title: row.title?.trim() || '',
        description: row.description?.trim() || undefined,
        status: row.status?.trim() || undefined,
        category: row.category?.trim() || undefined,
        startDate: row.startDate?.trim() || undefined,
        endDate: row.endDate?.trim() || undefined,
      });

      const validationErrors = await validate(dto);
      if (validationErrors.length > 0) {
        const msg = validationErrors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
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
              message: 'Importación abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        const project = await this.prisma.project.create({
          data: {
            clubId,
            title: (dto as CreateProjectDto).title.trim(),
            description: (dto as CreateProjectDto).description?.trim() ?? null,
            status: ((dto as CreateProjectDto).status as ProjectStatus) ?? ProjectStatus.IDEA,
            category: (dto as CreateProjectDto).category as ProjectCategory | undefined ?? null,
            startDate: (dto as CreateProjectDto).startDate
              ? new Date((dto as CreateProjectDto).startDate!)
              : null,
            endDate: (dto as CreateProjectDto).endDate
              ? new Date((dto as CreateProjectDto).endDate!)
              : null,
          },
        });

        await this.prisma.auditLog.create({
          data: {
            clubId,
            actorUserId,
            action: 'project.created',
            entityType: 'Project',
            entityId: project.id,
            metadataJson: JSON.stringify({ title: project.title }),
          },
        });

        result.created++;
        result.createdIds!.push(project.id);
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

  async create(clubId: string, dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        clubId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        status: dto.status ?? ProjectStatus.IDEA,
        category: dto.category ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedToId: dto.assignedToId ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'project.created',
        entityType: 'Project',
        entityId: project.id,
        metadataJson: JSON.stringify({ title: project.title }),
      },
    });

    return project;
  }

  async update(id: string, clubId: string, dto: UpdateProjectDto) {
    await this.findOne(id, clubId);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.category !== undefined && { category: dto.category ?? null }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.assignedToId !== undefined && {
          assignedToId: dto.assignedToId ?? null,
        }),
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    clubId: string,
    status: ProjectStatus,
    userId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }

    const allowed = VALID_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `No se puede pasar de ${project.status} a ${status}`,
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'project.status.changed',
        entityType: 'Project',
        entityId: id,
        metadataJson: JSON.stringify({
          from: project.status,
          to: status,
        }),
      },
    });

    return updated;
  }

  async addProgress(id: string, clubId: string, dto: AddProgressDto) {
    await this.findOne(id, clubId);

    return this.prisma.projectProgress.create({
      data: {
        projectId: id,
        description: dto.description.trim(),
        progressDate: new Date(dto.progressDate),
      },
    });
  }
}
