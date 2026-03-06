import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VoteChoice, VoteSessionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class VotingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  async openVote(meetingId: string, topicId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== 'LIVE' && meeting.status !== 'PAUSED')
      throw new BadRequestException('Solo se puede abrir votación en reunión en vivo o pausada');
    const topic = await this.prisma.agendaTopic.findFirst({
      where: { id: topicId, meetingId },
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    const existing = await this.prisma.voteSession.findFirst({
      where: { meetingId, topicId, status: VoteSessionStatus.OPEN },
    });
    if (existing) throw new BadRequestException('Ya hay una votación abierta para este tema');
    const session = await this.prisma.voteSession.create({
      data: { meetingId, topicId, openedById: userId },
      include: { topic: true },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.session.opened',
      entityType: 'VoteSession',
      entityId: session.id,
    });
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.opened', {
      voteSessionId: session.id,
      topicId: session.topicId,
      topicTitle: session.topic.title,
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
    const result = await this.aggregateResult(voteSessionId);
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.closed', {
      meetingId,
      voteSessionId,
      topicId: session.topicId,
      counts: { yes: result.yes, no: result.no, abstain: result.abstain },
      total: result.total,
    });
    await this.realtime.broadcastSnapshot(meetingId);
    return updated;
  }

  async submitVote(meetingId: string, voteSessionId: string, userId: string, choice: VoteChoice) {
    const session = await this.prisma.voteSession.findFirst({
      where: { id: voteSessionId, meetingId },
    });
    if (!session) throw new NotFoundException('Sesión de votación no encontrada');
    if (session.status !== VoteSessionStatus.OPEN)
      throw new BadRequestException('La votación no está abierta');
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
    if (!participant?.canVote) {
      throw new ForbiddenException('No tenés derecho a votar en esta reunión');
    }
    const vote = await this.prisma.vote.upsert({
      where: {
        voteSessionId_userId: { voteSessionId, userId },
      },
      create: { voteSessionId, userId, choice },
      update: { choice },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'vote.cast',
      entityType: 'Vote',
      entityId: vote.id,
    });
    const result = await this.aggregateResult(voteSessionId);
    await this.realtime.emitToMeeting(meetingId, 'meeting.vote.result', {
      meetingId,
      voteSessionId,
      topicId: session.topicId,
      counts: { yes: result.yes, no: result.no, abstain: result.abstain },
      total: result.total,
    });
    return result;
  }

  async getResult(voteSessionId: string) {
    const session = await this.prisma.voteSession.findUnique({
      where: { id: voteSessionId },
      include: { topic: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    return this.aggregateResult(voteSessionId);
  }

  async getDetailedResult(voteSessionId: string) {
    const session = await this.prisma.voteSession.findUnique({
      where: { id: voteSessionId },
      include: { topic: true, votes: true },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    const aggregate = await this.aggregateResult(voteSessionId);
    const votes = await this.prisma.vote.findMany({
      where: { voteSessionId },
      include: { session: false },
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
