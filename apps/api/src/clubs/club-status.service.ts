import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ClubStatusSummary = {
  clubId: string;
  constituido: boolean;
  activo: boolean;
  habilitado: boolean;
  cuotaAldia: boolean;
  informeAlDia: boolean;
};

@Injectable()
export class ClubStatusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Art. 8: Club "activo" = participated in at least 1 of the last 3
   * ordinary district meetings (Consejo Distrital) through president or delegate.
   */
  async isActivo(clubId: string): Promise<boolean> {
    const lastThreeMeetings = await this.prisma.meeting.findMany({
      where: {
        type: 'ORDINARY',
        isDistrictMeeting: true,
        status: { in: ['FINISHED', 'ARCHIVED'] },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 3,
      select: { id: true },
    });

    if (lastThreeMeetings.length === 0) {
      // No meetings yet — all constituted clubs default to active
      return true;
    }

    const meetingIds = lastThreeMeetings.map((m) => m.id);
    const attendance = await this.prisma.clubMeetingAttendance.findFirst({
      where: {
        clubId,
        meetingId: { in: meetingIds },
      },
    });

    return !!attendance;
  }

  /**
   * Art. 9: Club "habilitado" = activo + cuota al día + informe al día.
   */
  async isHabilitado(clubId: string): Promise<boolean> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { cuotaAldia: true, informeAlDia: true, status: true, isConstituido: true },
    });
    if (!club || club.status !== 'ACTIVE' || !club.isConstituido) return false;
    if (!club.cuotaAldia || !club.informeAlDia) return false;
    return this.isActivo(clubId);
  }

  async getClubStatusSummary(clubId: string): Promise<ClubStatusSummary> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { cuotaAldia: true, informeAlDia: true, isConstituido: true },
    });
    const activo = await this.isActivo(clubId);
    return {
      clubId,
      constituido: club?.isConstituido ?? false,
      activo,
      habilitado: activo && (club?.cuotaAldia ?? false) && (club?.informeAlDia ?? false),
      cuotaAldia: club?.cuotaAldia ?? false,
      informeAlDia: club?.informeAlDia ?? false,
    };
  }

  /**
   * Returns all clubs that are habilitado (active + cuota + informe).
   * Used for quorum calculation.
   */
  async getHabilitadoClubs(): Promise<{ id: string; name: string }[]> {
    const activeClubs = await this.prisma.club.findMany({
      where: {
        status: 'ACTIVE',
        isConstituido: true,
        cuotaAldia: true,
        informeAlDia: true,
        enabledForDistrictMeetings: true,
      },
      select: { id: true, name: true },
    });

    // Filter by attendance (activo check)
    const lastThreeMeetings = await this.prisma.meeting.findMany({
      where: {
        type: 'ORDINARY',
        isDistrictMeeting: true,
        status: { in: ['FINISHED', 'ARCHIVED'] },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 3,
      select: { id: true },
    });

    if (lastThreeMeetings.length === 0) {
      return activeClubs;
    }

    const meetingIds = lastThreeMeetings.map((m) => m.id);
    const attendances = await this.prisma.clubMeetingAttendance.findMany({
      where: { meetingId: { in: meetingIds } },
      select: { clubId: true },
    });
    const activoClubIds = new Set(attendances.map((a) => a.clubId));

    return activeClubs.filter((c) => activoClubIds.has(c.id));
  }

  async getHabilitadoClubCount(): Promise<number> {
    const clubs = await this.getHabilitadoClubs();
    return clubs.length;
  }

  /**
   * Batch compute status for all clubs. Efficient for admin views.
   */
  async getAllClubStatuses(): Promise<Map<string, ClubStatusSummary>> {
    const clubs = await this.prisma.club.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, cuotaAldia: true, informeAlDia: true, isConstituido: true },
    });

    const lastThreeMeetings = await this.prisma.meeting.findMany({
      where: {
        type: 'ORDINARY',
        isDistrictMeeting: true,
        status: { in: ['FINISHED', 'ARCHIVED'] },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 3,
      select: { id: true },
    });

    let activoClubIds: Set<string>;
    if (lastThreeMeetings.length === 0) {
      activoClubIds = new Set(clubs.map((c) => c.id));
    } else {
      const meetingIds = lastThreeMeetings.map((m) => m.id);
      const attendances = await this.prisma.clubMeetingAttendance.findMany({
        where: { meetingId: { in: meetingIds } },
        select: { clubId: true },
      });
      activoClubIds = new Set(attendances.map((a) => a.clubId));
    }

    const result = new Map<string, ClubStatusSummary>();
    for (const club of clubs) {
      const activo = activoClubIds.has(club.id);
      result.set(club.id, {
        clubId: club.id,
        constituido: club.isConstituido,
        activo,
        habilitado: activo && club.cuotaAldia && club.informeAlDia,
        cuotaAldia: club.cuotaAldia,
        informeAlDia: club.informeAlDia,
      });
    }
    return result;
  }
}
