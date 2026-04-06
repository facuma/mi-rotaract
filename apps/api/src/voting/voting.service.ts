import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MajorityType, VoteChoice, VoteSessionStatus, VotingMethod } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type VoteResult = {
  voteSessionId: string;
  yes: number;
  no: number;
  abstain: number;
  total: number;
  eligibleClubCount: number | null;
  approved: boolean | null;
  requiredMajority: MajorityType;
  isTied: boolean;
  rdrTiebreakerUsed: boolean;
};

@Injectable()
export class VotingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  async openVote(
    meetingId: string,
    topicId: string,
    userId: string,
    options?: {
      votingMethod?: VotingMethod;
      requiredMajority?: MajorityType;
      isElection?: boolean;
    },
  ) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== 'LIVE' && meeting.status !== 'PAUSED')
      throw new BadRequestException('Solo se puede abrir votación en reunión en vivo o pausada');

    // Art. 42: Block voting if informational only (no quorum)
    if (meeting.isInformationalOnly) {
      throw new BadRequestException('No se pueden realizar votaciones sin quórum (Art. 42). Reunión informativa.');
    }

    const topic = await this.prisma.agendaTopic.findFirst({
      where: { id: topicId, meetingId },
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    const existing = await this.prisma.voteSession.findFirst({
      where: { meetingId, topicId, status: VoteSessionStatus.OPEN },
    });
    if (existing) throw new BadRequestException('Ya hay una votación abierta para este tema');

    // Capture "papeletas": clubs currently connected at voting time
    const connectedClubIds = meeting.isDistrictMeeting
      ? this.realtime.getConnectedClubIds(meetingId)
      : [];

    const session = await this.prisma.voteSession.create({
      data: {
        meetingId,
        topicId,
        openedById: userId,
        votingMethod: options?.votingMethod ?? VotingMethod.PUBLIC,
        requiredMajority: options?.requiredMajority ?? MajorityType.SIMPLE,
        isElection: options?.isElection ?? false,
        eligibleClubIds: connectedClubIds.length > 0 ? JSON.stringify(connectedClubIds) : null,
        eligibleClubCount: connectedClubIds.length > 0 ? connectedClubIds.length : null,
      },
      include: { topic: true },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.session.opened',
      entityType: 'VoteSession',
      entityId: session.id,
      metadata: {
        votingMethod: session.votingMethod,
        requiredMajority: session.requiredMajority,
        isElection: session.isElection,
      },
    });
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.opened', {
      voteSessionId: session.id,
      topicId: session.topicId,
      topicTitle: session.topic.title,
      votingMethod: session.votingMethod,
      requiredMajority: session.requiredMajority,
    });
    await this.realtime.broadcastSnapshot(meetingId);
    return session;
  }

  async closeVote(meetingId: string, voteSessionId: string, userId: string) {
    const session = await this.prisma.voteSession.findFirst({
      where: { id: voteSessionId, meetingId },
    });
    if (!session) throw new NotFoundException('Sesión de votación no encontrada');
    if (session.status !== VoteSessionStatus.OPEN)
      throw new BadRequestException('La votación ya está cerrada');
    const updated = await this.prisma.voteSession.update({
      where: { id: voteSessionId },
      data: { status: VoteSessionStatus.CLOSED, closedAt: new Date(), closedById: userId },
      include: { topic: true },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.session.closed',
      entityType: 'VoteSession',
      entityId: voteSessionId,
    });
    const result = await this.evaluateResult(voteSessionId);
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.closed', {
      meetingId,
      voteSessionId,
      topicId: session.topicId,
      counts: { yes: result.yes, no: result.no, abstain: result.abstain },
      total: result.total,
      approved: result.approved,
      isTied: result.isTied,
      requiredMajority: result.requiredMajority,
    });
    await this.realtime.broadcastSnapshot(meetingId);
    return { ...updated, result };
  }

  async submitVote(meetingId: string, voteSessionId: string, userId: string, choice: VoteChoice) {
    const [session, meeting] = await Promise.all([
      this.prisma.voteSession.findFirst({ where: { id: voteSessionId, meetingId } }),
      this.prisma.meeting.findUnique({ where: { id: meetingId } }),
    ]);
    if (!session) throw new NotFoundException('Sesión de votación no encontrada');
    if (session.status !== VoteSessionStatus.OPEN)
      throw new BadRequestException('La votación no está abierta');
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // Art. 42: Block if informational only
    if (meeting.isInformationalOnly) {
      throw new ForbiddenException('No se pueden emitir votos sin quórum (Art. 42).');
    }

    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
    if (!participant?.canVote) {
      throw new ForbiddenException('No tenés derecho a votar en esta reunión');
    }

    let clubId: string | null = null;

    // Art. 45: For district meetings, one vote per club
    if (meeting.isDistrictMeeting) {
      clubId = participant.clubId;

      // If participant has no clubId, try to resolve from membership
      if (!clubId) {
        const membership = await this.prisma.membership.findFirst({
          where: { userId },
          select: { clubId: true },
        });
        clubId = membership?.clubId ?? null;

        // Update participant record for future votes
        if (clubId) {
          await this.prisma.meetingParticipant.update({
            where: { meetingId_userId: { meetingId, userId } },
            data: { clubId },
          });
        }
      }

      if (!clubId) {
        throw new ForbiddenException('No se puede votar sin club asociado en reunión distrital');
      }

      // Validate against eligible clubs ("papeletas") if recorded
      if (session.eligibleClubIds) {
        const eligible: string[] = JSON.parse(session.eligibleClubIds);
        if (!eligible.includes(clubId)) {
          throw new ForbiddenException('Tu club no estaba presente al momento de abrir la votación');
        }
      }

      // Check if this club already voted (by another user)
      const existingClubVote = await this.prisma.vote.findFirst({
        where: { voteSessionId, clubId },
      });
      if (existingClubVote && existingClubVote.userId !== userId) {
        throw new ForbiddenException('Tu club ya emitió un voto en esta votación');
      }
    }

    const vote = await this.prisma.vote.upsert({
      where: {
        voteSessionId_userId: { voteSessionId, userId },
      },
      create: { voteSessionId, userId, clubId, choice },
      update: { choice, clubId },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.cast',
      entityType: 'Vote',
      entityId: vote.id,
    });
    const result = await this.evaluateResult(voteSessionId);
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.result', {
      meetingId,
      voteSessionId,
      topicId: session.topicId,
      counts: { yes: result.yes, no: result.no, abstain: result.abstain },
      total: result.total,
      approved: result.approved,
      isTied: result.isTied,
    });
    return result;
  }

  /**
   * Art. 49: RDR votes only on tie. Final and unappealable.
   */
  async submitRdrTiebreaker(meetingId: string, voteSessionId: string, userId: string, choice: VoteChoice) {
    const session = await this.prisma.voteSession.findFirst({
      where: { id: voteSessionId, meetingId, status: VoteSessionStatus.CLOSED },
    });
    if (!session) throw new NotFoundException('Sesión de votación no encontrada o no está cerrada');
    if (session.rdrTiebreakerUsed) {
      throw new BadRequestException('El desempate del RDR ya fue utilizado');
    }

    // Verify it's actually tied
    const result = await this.aggregateResult(voteSessionId);
    if (result.yes !== result.no) {
      throw new BadRequestException('No hay empate. El RDR solo vota en caso de empate (Art. 49)');
    }

    await this.prisma.voteSession.update({
      where: { id: voteSessionId },
      data: {
        rdrTiebreakerUsed: true,
        rdrTiebreakerChoice: choice,
      },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.rdr.tiebreaker',
      entityType: 'VoteSession',
      entityId: voteSessionId,
      metadata: { choice },
    });
    await this.realtime.broadcastSnapshot(meetingId);

    return this.evaluateResult(voteSessionId);
  }

  async getResult(voteSessionId: string) {
    const session = await this.prisma.voteSession.findUnique({
      where: { id: voteSessionId },
      include: { topic: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return this.evaluateResult(voteSessionId);
  }

  async getDetailedResult(voteSessionId: string) {
    const session = await this.prisma.voteSession.findUnique({
      where: { id: voteSessionId },
      include: { topic: true, votes: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');

    const aggregate = await this.evaluateResult(voteSessionId);

    // Art. 50: For secret votes, don't expose individual vote choices
    if (session.votingMethod === VotingMethod.SECRET) {
      return { ...aggregate, votes: [] };
    }

    const votes = await this.prisma.vote.findMany({
      where: { voteSessionId },
    });
    const userIds = [...new Set(votes.map((v) => v.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return {
      ...aggregate,
      votes: votes.map((v) => ({
        userId: v.userId,
        clubId: v.clubId,
        choice: v.choice,
        user: userMap[v.userId],
      })),
    };
  }

  async getOpenSession(meetingId: string) {
    return this.prisma.voteSession.findFirst({
      where: { meetingId, status: VoteSessionStatus.OPEN },
      include: { topic: true },
    });
  }

  /**
   * Evaluate the result of a vote session applying the correct majority rule.
   */
  private async evaluateResult(voteSessionId: string): Promise<VoteResult> {
    const session = await this.prisma.voteSession.findUnique({
      where: { id: voteSessionId },
    });
    const counts = await this.aggregateResult(voteSessionId);

    let { yes, no } = counts;
    const majority = session?.requiredMajority ?? MajorityType.SIMPLE;
    const rdrTiebreakerUsed = session?.rdrTiebreakerUsed ?? false;

    // Apply RDR tiebreaker if used
    if (rdrTiebreakerUsed && session?.rdrTiebreakerChoice) {
      if (session.rdrTiebreakerChoice === VoteChoice.YES) yes++;
      else if (session.rdrTiebreakerChoice === VoteChoice.NO) no++;
    }

    const isTied = yes === no && !rdrTiebreakerUsed;
    const votesForMajority = yes + no; // abstentions don't count for majority calc
    let approved: boolean | null = null;

    // For ABSOLUTE/TWO_THIRDS/THREE_QUARTERS with eligible clubs, use eligibleClubCount
    // as the denominator (= papeletas presentes), not just votes cast
    const eligibleCount = session?.eligibleClubCount ?? votesForMajority;

    if (!isTied && votesForMajority > 0) {
      switch (majority) {
        case MajorityType.SIMPLE:
          approved = yes > no;
          break;
        case MajorityType.ABSOLUTE:
          // > 50% of present clubs (papeletas)
          approved = yes > eligibleCount / 2;
          break;
        case MajorityType.TWO_THIRDS:
          // Art. 65-66: >= 2/3 of present clubs
          approved = yes >= (eligibleCount * 2) / 3;
          break;
        case MajorityType.THREE_QUARTERS:
          // Art. 35e: >= 3/4 of present clubs
          approved = yes >= (eligibleCount * 3) / 4;
          break;
      }
    }

    return {
      voteSessionId,
      yes,
      no,
      abstain: counts.abstain,
      total: counts.total,
      eligibleClubCount: session?.eligibleClubCount ?? null,
      approved,
      requiredMajority: majority,
      isTied,
      rdrTiebreakerUsed,
    };
  }

  private async aggregateResult(voteSessionId: string) {
    const votes = await this.prisma.vote.groupBy({
      by: ['choice'],
      where: { voteSessionId },
      _count: true,
    });
    const map = Object.fromEntries(votes.map((v) => [v.choice, v._count]));
    return {
      voteSessionId,
      yes: map.YES ?? 0,
      no: map.NO ?? 0,
      abstain: map.ABSTAIN ?? 0,
      total: (map.YES ?? 0) + (map.NO ?? 0) + (map.ABSTAIN ?? 0),
    };
  }
}
