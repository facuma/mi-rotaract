import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClubStatusService } from '../clubs/club-status.service';

export type QuorumStatus = {
  required: number;
  present: number;
  met: boolean;
  isInformationalOnly: boolean;
};

@Injectable()
export class QuorumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubStatus: ClubStatusService,
  ) {}

  /**
   * Art. 41: Quorum = 2/3 of habilitado clubs.
   */
  async calculateQuorumRequirement(): Promise<number> {
    const count = await this.clubStatus.getHabilitadoClubCount();
    return Math.ceil((count * 2) / 3);
  }

  /**
   * Check quorum for a specific meeting by counting distinct clubs present.
   */
  async checkQuorum(meetingId: string): Promise<QuorumStatus> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { quorumRequired: true, isInformationalOnly: true },
    });

    const required = meeting?.quorumRequired ?? await this.calculateQuorumRequirement();

    const presentClubs = await this.prisma.clubMeetingAttendance.count({
      where: { meetingId },
    });

    const met = presentClubs >= required;

    return {
      required,
      present: presentClubs,
      met,
      isInformationalOnly: !met,
    };
  }

  /**
   * Record a club's attendance at a meeting.
   * Called when a president or carta poder delegate joins.
   */
  async recordClubAttendance(
    meetingId: string,
    clubId: string,
    attendeeUserId: string,
    isDelegate = false,
    cartaPoderId?: string,
  ): Promise<void> {
    await this.prisma.clubMeetingAttendance.upsert({
      where: { meetingId_clubId: { meetingId, clubId } },
      create: {
        meetingId,
        clubId,
        attendeeUserId,
        isDelegate,
        cartaPoderId: cartaPoderId ?? null,
      },
      update: {
        attendeeUserId,
        isDelegate,
        cartaPoderId: cartaPoderId ?? null,
      },
    });
  }

  /**
   * Update meeting quorum status and return the current status.
   */
  async recheckAndUpdateQuorum(meetingId: string): Promise<QuorumStatus> {
    const status = await this.checkQuorum(meetingId);

    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        quorumMet: status.met,
        isInformationalOnly: status.isInformationalOnly,
      },
    });

    return status;
  }
}
