import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClubMeDto } from './dto/update-club-me.dto';

@Injectable()
export class ClubService {
  constructor(private readonly prisma: PrismaService) {}

  async getPeriods() {
    return this.prisma.districtPeriod.findMany({
      orderBy: { startDate: 'desc' },
      take: 20,
    });
  }

  async getMyClub(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        memberships: {
          where: {
            OR: [
              { activeUntil: null },
              { activeUntil: { gt: new Date() } },
            ],
          },
          orderBy: [{ isPresident: 'desc' }, { title: 'asc' }],
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!club) throw new NotFoundException('Club no encontrado');
    return club;
  }

  async getSummary(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        code: true,
        logoUrl: true,
        city: true,
        zone: true,
        foundedAt: true,
        description: true,
        contactEmail: true,
        contactPhone: true,
        informeAlDia: true,
        cuotaAldia: true,
        memberships: {
          where: {
            OR: [
              { activeUntil: null },
              { activeUntil: { gt: new Date() } },
            ],
          },
          orderBy: [{ isPresident: 'desc' }, { title: 'asc' }],
          select: {
            title: true,
            isPresident: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!club) throw new NotFoundException('Club no encontrado');

    const [recentReports, recentProjects] = await Promise.all([
      this.prisma.report.findMany({
        where: { clubId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.project.findMany({
        where: { clubId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    const recentActivity = [
      ...recentReports.map((r) => ({
        type: 'report' as const,
        id: r.id,
        label: `Informe ${r.type}`,
        status: r.status,
        date: r.submittedAt ?? r.updatedAt,
      })),
      ...recentProjects.map((p) => ({
        type: 'project' as const,
        id: p.id,
        label: p.title,
        status: p.status,
        date: p.updatedAt,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return { ...club, recentActivity };
  }

  async updateMyClub(
    clubId: string,
    dto: UpdateClubMeDto,
    userId: string,
  ) {
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl ?? null }),
        ...(dto.city !== undefined && { city: dto.city ?? null }),
        ...(dto.zone !== undefined && { zone: dto.zone ?? null }),
        ...(dto.foundedAt !== undefined && {
          foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description ?? null,
        }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail ?? null,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone ?? null,
        }),
      },
    });

    const fields = Object.keys(dto);
    await this.prisma.auditLog.create({
      data: {
        clubId,
        actorUserId: userId,
        action: 'club.updated',
        entityType: 'Club',
        entityId: clubId,
        metadataJson: JSON.stringify({ fields }),
      },
    });

    return this.getMyClub(clubId);
  }
}
