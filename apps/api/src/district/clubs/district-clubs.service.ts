import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubsService } from '../../clubs/clubs.service';

export interface DistrictClubsQuery {
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
  informeAlDia?: boolean;
  enabledForDistrictMeetings?: boolean;
}

@Injectable()
export class DistrictClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubsService: ClubsService,
  ) {}

  async findAll(query: DistrictClubsQuery) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.informeAlDia !== undefined) where.informeAlDia = query.informeAlDia;
    if (query.enabledForDistrictMeetings !== undefined) {
      where.enabledForDistrictMeetings = query.enabledForDistrictMeetings;
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.club.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const club = await this.clubsService.findOne(id);
    const [memberships, recentReports] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          clubId: id,
          OR: [{ activeUntil: null }, { activeUntil: { gte: new Date() } }],
        },
        orderBy: [{ isPresident: 'desc' }, { activeFrom: 'desc' }],
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.report.findMany({
        where: { clubId: id },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: {
          districtPeriod: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      ...club,
      authorities: memberships.map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        title: m.title,
        isPresident: m.isPresident,
        activeFrom: m.activeFrom,
        activeUntil: m.activeUntil,
      })),
      recentReports,
    };
  }

  async findClubReports(clubId: string, periodId?: string) {
    await this.clubsService.findOne(clubId);
    const where: Record<string, unknown> = { clubId };
    if (periodId) where.districtPeriodId = periodId;
    const items = await this.prisma.report.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        districtPeriod: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });
    return { items };
  }
}
