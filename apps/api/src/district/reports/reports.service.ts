import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportType } from '@prisma/client';
import { QueryReportsDto } from './dto/query-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryReportsDto) {
    const { periodId, clubId, status, type, page = '1', limit = '20' } = query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where: Record<string, unknown> = {};
    if (periodId) where.districtPeriodId = periodId;
    if (clubId) where.clubId = clubId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          club: { select: { id: true, name: true, code: true } },
          districtPeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
          reviewer: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total, page: parseInt(page, 10), limit: take };
  }

  async findMissing(periodId: string, type?: ReportType) {
    const period = await this.prisma.districtPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Período no encontrado');

    const activeClubs = await this.prisma.club.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
    });

    const types = type ? [type] : (Object.keys(ReportType) as ReportType[]);
    const reported = await this.prisma.report.findMany({
      where: {
        districtPeriodId: periodId,
        status: { not: 'DRAFT' },
        type: type ? type : { in: types },
      },
      select: { clubId: true, type: true },
    });
    const reportedSet = new Set(reported.map((r) => `${r.clubId}:${r.type}`));

    const missing: { clubId: string; clubName: string; clubCode: string; type: ReportType }[] = [];
    for (const club of activeClubs) {
      for (const t of types) {
        if (!reportedSet.has(`${club.id}:${t}`)) {
          missing.push({
            clubId: club.id,
            clubName: club.name,
            clubCode: club.code,
            type: t,
          });
        }
      }
    }
    return { periodId, periodName: period.name, missing };
  }

  async getSummary(periodId: string, type?: ReportType) {
    const period = await this.prisma.districtPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Período no encontrado');

    const activeClubsCount = await this.prisma.club.count({
      where: { status: 'ACTIVE' },
    });

    const types = type ? [type] : (Object.keys(ReportType) as ReportType[]);
    const reports = await this.prisma.report.findMany({
      where: {
        districtPeriodId: periodId,
        status: { in: ['SUBMITTED', 'OBSERVED', 'APPROVED'] },
        type: type ? type : { in: types },
      },
      select: { clubId: true, status: true, type: true },
    });

    const byStatus = reports.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const submittedCount = reports.length;
    const approvedCount = byStatus['APPROVED'] || 0;
    const pctAlDia = activeClubsCount > 0 ? Math.round((submittedCount / (activeClubsCount * types.length)) * 100) : 0;

    return {
      periodId,
      periodName: period.name,
      activeClubsCount,
      reportsSubmitted: submittedCount,
      reportsApproved: approvedCount,
      reportsObserved: byStatus['OBSERVED'] || 0,
      pctClubesAlDia: pctAlDia,
      byStatus,
    };
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, code: true } },
        districtPeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
        reviewer: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!report) throw new NotFoundException('Informe no encontrado');
    return report;
  }

  async update(id: string, dto: UpdateReportDto, userId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Informe no encontrado');
    if (
      dto.status &&
      !['OBSERVED', 'APPROVED', 'REJECTED'].includes(dto.status)
    ) {
      throw new ForbiddenException(
        'Solo se puede marcar OBSERVED, APPROVED o REJECTED',
      );
    }

    const data: Record<string, unknown> = {
      ...(dto.observations !== undefined && { observations: dto.observations ?? null }),
      ...(dto.status && {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedById: userId,
      }),
    };
    return this.prisma.report.update({
      where: { id },
      data,
      include: {
        club: { select: { id: true, name: true, code: true } },
        districtPeriod: { select: { id: true, name: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });
  }
}
