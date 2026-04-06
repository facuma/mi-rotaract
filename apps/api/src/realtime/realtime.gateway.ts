import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { VoteChoice } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { VotingService } from '../voting/voting.service';
import { QuorumService } from '../meetings/quorum.service';

const MEETING_ROOM_PREFIX = 'meeting:';

interface SocketWithData {
  id: string;
  join: (r: string) => void;
  leave: (r: string) => void;
  handshake?: { auth?: { token?: string }; query?: { token?: string } };
  data?: { userId?: string; meetingIds?: string[] };
  rooms?: Set<string> | string[];
}

@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // In-memory tracking: meetingId -> Map<clubId, Set<socketId>>
  private connectedClubs = new Map<string, Map<string, Set<string>>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => VotingService))
    private readonly votingService: VotingService,
    @Inject(forwardRef(() => QuorumService))
    private readonly quorumService: QuorumService,
  ) {}

  /** Get count of clubs with at least 1 connected socket */
  getConnectedClubCount(meetingId: string): number {
    const clubs = this.connectedClubs.get(meetingId);
    if (!clubs) return 0;
    let count = 0;
    for (const sockets of clubs.values()) {
      if (sockets.size > 0) count++;
    }
    return count;
  }

  /** Get IDs of clubs currently connected */
  getConnectedClubIds(meetingId: string): string[] {
    const clubs = this.connectedClubs.get(meetingId);
    if (!clubs) return [];
    const ids: string[] = [];
    for (const [clubId, sockets] of clubs.entries()) {
      if (sockets.size > 0) ids.push(clubId);
    }
    return ids;
  }

  private trackClubConnect(meetingId: string, clubId: string, socketId: string) {
    if (!this.connectedClubs.has(meetingId)) {
      this.connectedClubs.set(meetingId, new Map());
    }
    const clubs = this.connectedClubs.get(meetingId)!;
    if (!clubs.has(clubId)) clubs.set(clubId, new Set());
    clubs.get(clubId)!.add(socketId);
  }

  private trackClubDisconnect(meetingId: string, socketId: string) {
    const clubs = this.connectedClubs.get(meetingId);
    if (!clubs) return;
    for (const sockets of clubs.values()) {
      sockets.delete(socketId);
    }
  }

  handleConnection() {}

  async handleDisconnect(client: SocketWithData) {
    const meetingIds = client.data?.meetingIds ?? [];
    const userId = client.data?.userId;
    for (const meetingId of meetingIds) {
      this.trackClubDisconnect(meetingId, client.id);
      if (userId) {
        await this.markParticipantLeft(meetingId, userId);
      }
    }
    client.data = {};
  }

  private getUserIdFromClient(client: SocketWithData): string | null {
    const token =
      client.handshake?.auth?.token ||
      (typeof client.handshake?.query?.token === 'string' ? client.handshake.query.token : null);
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  @SubscribeMessage('join_meeting')
  async handleJoinMeeting(client: SocketWithData, payload: { meetingId: string; userId?: string }) {
    return this.doJoinMeeting(client, payload);
  }

  @SubscribeMessage('meeting.join')
  async handleMeetingJoin(client: SocketWithData, payload: { meetingId: string; userId?: string }) {
    return this.doJoinMeeting(client, payload);
  }

  private async doJoinMeeting(
    client: SocketWithData,
    payload: { meetingId: string; userId?: string },
  ) {
    const { meetingId } = payload;
    if (!meetingId) {
      return { event: 'error', data: { message: 'meetingId required' } };
    }
    const userId = this.getUserIdFromClient(client);
    if (!userId) {
      return { event: 'error', data: { message: 'Token requerido o inválido' } };
    }
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true },
    });
    if (!meeting) {
      return { event: 'error', data: { message: 'Reunión no encontrada' } };
    }
    const isParticipant = await this.prisma.meetingParticipant.findFirst({
      where: { meetingId, userId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isModerator = user?.role === 'SECRETARY' || user?.role === 'PRESIDENT' || user?.role === 'RDR';
    if (!isParticipant && !isModerator) {
      return { event: 'error', data: { message: 'No tenés acceso a esta reunión' } };
    }
    client.data = client.data ?? {};
    client.data.userId = userId;
    if (!Array.isArray(client.data.meetingIds)) client.data.meetingIds = [];
    if (!client.data.meetingIds.includes(meetingId)) client.data.meetingIds.push(meetingId);
    client.join(MEETING_ROOM_PREFIX + meetingId);
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
    if (participant) {
      // Resolve clubId if missing
      let clubId = participant.clubId;
      if (!clubId) {
        const membership = await this.prisma.membership.findFirst({
          where: { userId },
          select: { clubId: true },
        });
        clubId = membership?.clubId ?? null;
        if (clubId) {
          await this.prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: { clubId, attendanceStatus: 'JOINED', ...(participant.joinedAt ? {} : { joinedAt: new Date() }) },
          });
        } else {
          await this.prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: { attendanceStatus: 'JOINED', ...(participant.joinedAt ? {} : { joinedAt: new Date() }) },
          });
        }
      } else {
        await this.prisma.meetingParticipant.update({
          where: { id: participant.id },
          data: { attendanceStatus: 'JOINED', ...(participant.joinedAt ? {} : { joinedAt: new Date() }) },
        });
      }

      // Track club connection and register attendance
      if (clubId) {
        this.trackClubConnect(meetingId, clubId, client.id);
        try {
          await this.quorumService.recordClubAttendance(meetingId, clubId, userId, participant.isDelegate);
          await this.quorumService.recheckAndUpdateQuorum(meetingId);
        } catch { /* non-blocking */ }
      }

      await this.audit.log({
        meetingId,
        actorUserId: userId,
        action: 'participant.joined',
        entityType: 'MeetingParticipant',
        entityId: participant.id,
      });
      await this.broadcastSnapshot(meetingId);
    }
    const snapshot = await this.buildSnapshot(meetingId, userId);
    return { event: 'meeting.snapshot', data: snapshot };
  }

  private async markParticipantLeft(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId } },
    });
    if (participant) {
      await this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: { attendanceStatus: 'LEFT' },
      });
      await this.audit.log({
        meetingId,
        actorUserId: userId,
        action: 'participant.left',
        entityType: 'MeetingParticipant',
        entityId: participant.id,
      });
      await this.broadcastSnapshot(meetingId);
    }
  }

  @SubscribeMessage('leave_meeting')
  async handleLeaveMeeting(client: SocketWithData, payload: { meetingId: string }) {
    const meetingId = payload.meetingId;
    if (meetingId) {
      this.trackClubDisconnect(meetingId, client.id);
      const userId = client.data?.userId;
      if (userId) await this.markParticipantLeft(meetingId, userId);
      if (Array.isArray(client.data?.meetingIds)) {
        client.data.meetingIds = client.data.meetingIds.filter((id) => id !== meetingId);
      }
    }
    client.leave(MEETING_ROOM_PREFIX + meetingId);
  }

  @SubscribeMessage('vote.submit')
  async handleVoteSubmit(
    client: SocketWithData,
    payload: { meetingId: string; voteSessionId: string; choice: VoteChoice },
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return { event: 'error', data: { message: 'No autenticado' } };
    }
    const { meetingId, voteSessionId, choice } = payload;
    if (!meetingId || !voteSessionId || !choice) {
      return { event: 'error', data: { message: 'meetingId, voteSessionId y choice requeridos' } };
    }
    const room = MEETING_ROOM_PREFIX + meetingId;
    const inRoom = Array.isArray(client.rooms) ? client.rooms.includes(room) : client.rooms?.has?.(room);
    if (!inRoom) {
      return { event: 'error', data: { message: 'No estás en esta reunión' } };
    }
    try {
      const result = await this.votingService.submitVote(meetingId, voteSessionId, userId, choice);
      return { event: 'vote.confirmed', data: result };
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Error al registrar el voto';
      return { event: 'error', data: { message } };
    }
  }

  async emitToMeeting(meetingId: string, event: string, data: unknown) {
    this.server.to(MEETING_ROOM_PREFIX + meetingId).emit(event, data);
  }

  async broadcastSnapshot(meetingId: string) {
    const snapshot = await this.buildSnapshot(meetingId);
    await this.emitToMeeting(meetingId, 'meeting.snapshot', snapshot);
  }

  private async buildSnapshot(meetingId: string, userId?: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        topics: { orderBy: { order: 'asc' } },
        voteSessions: { where: { status: 'OPEN' }, include: { topic: true } },
        participants: { include: { user: { select: { id: true, fullName: true } } } },
        clubAttendances: { include: { club: { select: { id: true, name: true } } } },
        speakingRequests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          orderBy: { position: 'asc' },
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!meeting) return null;
    const currentTopic = meeting.currentTopicId
      ? meeting.topics.find((t) => t.id === meeting.currentTopicId)
      : null;
    const openVoteSession = meeting.voteSessions[0];

    // Run all independent queries in parallel
    const [ownVote, voteResult, activeTimers, currentSpeaker, nextSpeaker] = await Promise.all([
      // Own vote
      userId && openVoteSession
        ? this.prisma.vote.findUnique({
            where: { voteSessionId_userId: { voteSessionId: openVoteSession.id, userId } },
          }).then((v) => v ? { voteSessionId: v.voteSessionId, choice: v.choice } : null)
        : Promise.resolve(null),
      // Vote result (only fetch if no open session)
      !openVoteSession
        ? this.prisma.voteSession.findFirst({
            where: { meetingId, status: 'CLOSED' },
            orderBy: { closedAt: 'desc' },
          }).then(async (lastClosed) => {
            if (!lastClosed) return null;
            const counts = await this.prisma.vote.groupBy({
              by: ['choice'],
              where: { voteSessionId: lastClosed.id },
              _count: true,
            });
            const map = Object.fromEntries(counts.map((c) => [c.choice, c._count]));
            const yes = map.YES ?? 0;
            const no = map.NO ?? 0;
            const abstain = map.ABSTAIN ?? 0;
            return {
              voteSessionId: lastClosed.id,
              topicId: lastClosed.topicId,
              counts: { yes, no, abstain },
              total: yes + no + abstain,
            };
          })
        : Promise.resolve(null),
      // Timers
      this.prisma.timerSession.findMany({
        where: { meetingId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
      // Current speaker
      meeting.currentSpeakerId
        ? this.prisma.user.findUnique({ where: { id: meeting.currentSpeakerId }, select: { id: true, fullName: true } })
        : Promise.resolve(null),
      // Next speaker
      meeting.nextSpeakerId
        ? this.prisma.user.findUnique({ where: { id: meeting.nextSpeakerId }, select: { id: true, fullName: true } })
        : Promise.resolve(null),
    ]);

    const now = Date.now();
    const timers = activeTimers.map((t) => {
      const elapsed = Math.floor((now - t.startedAt.getTime()) / 1000);
      return {
        id: t.id,
        type: t.type,
        topicId: t.topicId ?? undefined,
        speakingRequestId: t.speakingRequestId ?? undefined,
        plannedDurationSec: t.plannedDurationSec,
        startedAt: t.startedAt.toISOString(),
        pausedAt: t.pausedAt?.toISOString(),
        overtimeSec: t.overtimeSec,
        elapsedSec: elapsed,
      };
    });
    const clubsPresent = this.getConnectedClubCount(meetingId);

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        type: meeting.type,
        isDistrictMeeting: meeting.isDistrictMeeting,
        isInformationalOnly: meeting.isInformationalOnly,
        currentTopicId: meeting.currentTopicId,
        currentSpeakerId: meeting.currentSpeakerId,
        nextSpeakerId: meeting.nextSpeakerId,
        startedAt: meeting.startedAt?.toISOString() ?? null,
        scheduledAt: meeting.scheduledAt?.toISOString() ?? null,
        endedAt: meeting.endedAt?.toISOString() ?? null,
      },
      quorum: meeting.isDistrictMeeting ? {
        required: meeting.quorumRequired ?? 0,
        present: clubsPresent,
        met: meeting.quorumMet,
        isInformationalOnly: meeting.isInformationalOnly,
      } : null,
      currentTopic: currentTopic
        ? {
            id: currentTopic.id,
            meetingId: currentTopic.meetingId,
            title: currentTopic.title,
            description: currentTopic.description,
            order: currentTopic.order,
            type: currentTopic.type,
            estimatedDurationSec: currentTopic.estimatedDurationSec,
            status: currentTopic.status,
          }
        : null,
      topics: meeting.topics.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        order: t.order,
        type: t.type,
        estimatedDurationSec: t.estimatedDurationSec,
        status: t.status,
      })),
      activeVote: openVoteSession
        ? {
            voteSessionId: openVoteSession.id,
            topicId: openVoteSession.topicId,
            topicTitle: openVoteSession.topic.title,
            openedAt: openVoteSession.openedAt.toISOString(),
            votingMethod: openVoteSession.votingMethod,
            requiredMajority: openVoteSession.requiredMajority,
            eligibleClubCount: openVoteSession.eligibleClubCount,
          }
        : null,
      ownVote,
      voteResult,
      timers,
      speakingQueue: meeting.speakingRequests.map((r) => ({
        id: r.id,
        meetingId: r.meetingId,
        userId: r.userId,
        status: r.status,
        position: r.position,
        requestedAt: r.requestedAt.toISOString(),
        acceptedAt: r.acceptedAt?.toISOString(),
        user: r.user,
      })),
      currentSpeaker: currentSpeaker ? { id: currentSpeaker.id, fullName: currentSpeaker.fullName } : null,
      nextSpeaker: nextSpeaker ? { id: nextSpeaker.id, fullName: nextSpeaker.fullName } : null,
      participants: meeting.participants.map((p) => ({
        userId: p.userId,
        clubId: p.clubId,
        fullName: p.user.fullName,
        attendanceStatus: p.attendanceStatus,
        canVote: p.canVote,
      })),
      clubAttendance: meeting.clubAttendances.map((a) => ({
        clubId: a.clubId,
        clubName: a.club.name,
        connected: this.getConnectedClubIds(meetingId).includes(a.clubId),
      })),
    };
  }
}
