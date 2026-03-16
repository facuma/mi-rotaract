import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus, ReportType } from '@prisma/client';
import { CreateClubReportDto } from './dto/create-club-report.dto';
import { UpdateClubReportDto } from './dto/update-club-report.dto';
import { QueryClubReportsDto } from './dto/query-club-reports.dto';

@Injectable()
export class ClubReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clubId: string, query: QueryClubReportsDto) {
    const { periodId, type, status, page = '1', limit = '20' } = query;
    const skip =
      (Math.max(1, parseInt(page, 10)) - 1) *
      Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where: Record<string, unknown> = { clubId };
    if (periodId) where.districtPeriodId = periodId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          districtPeriod: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total, page: parseInt(page, 10), limit: take };
  }

  async findOne(id: string, clubId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, code: true } },
        districtPeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }
    return report;
  }

  async create(
    clubId: string,
    dto: CreateClubReportDto,
    userId: string,
  ) {
    const period = await this.prisma.districtPeriod.findUnique({
      where: { id: dto.districtPeriodId },
    });
    if (!period) throw new NotFoundException('Período no encontrado');

    const existing = await this.prisma.report.findUnique({
      where: {
        clubId_districtPeriodId_type: {
          clubId,
          districtPeriodId: dto.districtPeriodId,
          type: dto.type,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un informe para este período y tipo',
      );
    }

    const report = await this.prisma.report.create({
      data: {
        clubId,
        districtPeriodId: dto.districtPeriodId,
        type: dto.type,
        contentJson: dto.contentJson,
        status: ReportStatus.DRAFT,
      },
      include: {
        districtPeriod: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'report.created',
        entityType: 'Report',
        entityId: report.id,
        metadataJson: JSON.stringify({ periodId: dto.districtPeriodId, type: dto.type }),
      },
    });

    return report;
  }

  async update(
    id: string,
    clubId: string,
    dto: UpdateClubReportDto,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }

    if (report.status === ReportStatus.DRAFT) {
      return this.prisma.report.update({
        where: { id },
        data: {
          ...(dto.contentJson !== undefined && { contentJson: dto.contentJson }),
        },
        include: {
          districtPeriod: { select: { id: true, name: true } },
        },
      });
    }

    if (
      report.status === ReportStatus.OBSERVED ||
      report.status === ReportStatus.REJECTED
    ) {
      return this.prisma.report.update({
        where: { id },
        data: {
          ...(dto.contentJson !== undefined && { contentJson: dto.contentJson }),
          ...(dto.responseToObservations !== undefined && {
            responseToObservations: dto.responseToObservations,
          }),
        },
        include: {
          districtPeriod: { select: { id: true, name: true } },
        },
      });
    }

    throw new ForbiddenException('No se puede editar este informe');
  }

  async submit(id: string, clubId: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException('Solo se puede enviar un borrador');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        districtPeriod: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'report.submitted',
        entityType: 'Report',
        entityId: id,
        metadataJson: JSON.stringify({
          periodId: report.districtPeriodId,
          type: report.type,
        }),
      },
    });

    return updated;
  }

  async resubmit(id: string, clubId: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (report.clubId !== clubId) {
      throw new ForbiddenException('No pertenece a su club');
    }
    if (
      report.status !== ReportStatus.OBSERVED &&
      report.status !== ReportStatus.REJECTED
    ) {
      throw new ForbiddenException(
        'Solo se puede reenviar un informe observado o rechazado',
      );
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: ReportStatus.SUBMITTED,
        resubmittedAt: new Date(),
      },
      include: {
        districtPeriod: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'report.resubmitted',
        entityType: 'Report',
        entityId: id,
        metadataJson: JSON.stringify({
          periodId: report.districtPeriodId,
          type: report.type,
        }),
      },
    });

    return updated;
  }
}
