'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '@/context/AuthContext';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type MeetingSnapshot = {
  meetingId: string;
  status: string;
  currentTopicId: string | null;
  currentTopic: { id: string; title: string; type: string } | null;
  topics: { id: string; title: string; order: number; type: string; status: string }[];
  activeVoteSession?: {
    id: string;
    topicId: string;
    topicTitle: string;
  } | null;
  speakingQueue?: { id: string; userId: string; fullName: string; position: number; status?: string }[];
  currentSpeaker?: { id: string; fullName: string } | null;
  nextSpeaker?: { id: string; fullName: string } | null;
  activeTimer?: {
    id: string;
    type: string;
    plannedDurationSec: number;
    remainingSec: number;
    overtimeSec: number;
  } | null;
};

export type VoteResult = { voteSessionId: string; yes: number; no: number; abstain: number; total: number };

function normalizeSnapshot(data: Record<string, unknown>): MeetingSnapshot {
  const meeting = data.meeting as { id?: string; status?: string } | undefined;
  const activeVote = data.activeVote as { voteSessionId?: string; topicId?: string; topicTitle?: string } | undefined;
  const timers = (data.timers as Array<{ id: string; type: string; plannedDurationSec: number; elapsedSec?: number }>) ?? [];
  const firstTimer = timers[0];
  return {
    meetingId: meeting?.id ?? '',
    status: meeting?.status ?? '',
    currentTopicId: (data.currentTopic as { id?: string })?.id ?? null,
    currentTopic: data.currentTopic as MeetingSnapshot['currentTopic'],
    topics: (data.topics as MeetingSnapshot['topics']) ?? [],
    activeVoteSession: activeVote
      ? { id: activeVote.voteSessionId ?? '', topicId: activeVote.topicId ?? '', topicTitle: activeVote.topicTitle ?? '' }
      : null,
    speakingQueue: ((data.speakingQueue as Array<{ id: string; userId: string; fullName?: string; user?: { fullName?: string }; position: number; status?: string }>) ?? []).map((r) => ({
      id: r.id,
      userId: r.userId,
      fullName: r.fullName ?? r.user?.fullName ?? '—',
      position: r.position,
      status: r.status,
    })),
    currentSpeaker: data.currentSpeaker as MeetingSnapshot['currentSpeaker'],
    nextSpeaker: data.nextSpeaker as MeetingSnapshot['nextSpeaker'],
    activeTimer: firstTimer
      ? {
          id: firstTimer.id,
          type: firstTimer.type,
          plannedDurationSec: firstTimer.plannedDurationSec,
          remainingSec: Math.max(0, firstTimer.plannedDurationSec - (firstTimer.elapsedSec ?? 0)),
          overtimeSec: Math.max(0, (firstTimer.elapsedSec ?? 0) - firstTimer.plannedDurationSec),
        }
      : null,
  };
}

function joinMeetingWithAck(
  s: Socket,
  meetingId: string,
  setSnapshot: (data: MeetingSnapshot | null) => void,
  setJoinError: (msg: string | null) => void,
) {
  s.emit(
    'meeting.join',
    { meetingId },
    (res: { event?: string; data?: unknown } | undefined) => {
      if (!res) return;
      if (res.event === 'meeting.snapshot' && res.data && typeof res.data === 'object') {
        setSnapshot(normalizeSnapshot(res.data as Record<string, unknown>));
        setJoinError(null);
      }
      if (res.event === 'error') {
        const msg = res.data && typeof res.data === 'object' && 'message' in res.data ? String((res.data as { message: unknown }).message) : 'Error al unirse';
        setJoinError(msg);
      }
    },
  );
}

export function useMeetingRoom(meetingId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [snapshot, setSnapshot] = useState<MeetingSnapshot | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [connected, setConnected] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    const token = getStoredToken();
    const s = io(WS_URL, {
      auth: { token: token ?? undefined },
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    s.on('connect', () => {
      setConnected(true);
      setJoinError(null);
      joinMeetingWithAck(s, meetingId, setSnapshot, setJoinError);
    });
    s.on('disconnect', () => setConnected(false));
    s.on('meeting.snapshot', (data: Record<string, unknown>) => {
      setSnapshot(normalizeSnapshot(data));
      setJoinError(null);
    });
    s.on('meeting.vote.closed', (data: { voteSessionId?: string; counts?: { yes: number; no: number; abstain: number }; total?: number }) => {
      if (data.voteSessionId && data.counts != null && data.total != null) {
        setVoteResult({ voteSessionId: data.voteSessionId, ...data.counts, total: data.total });
      }
    });
    s.on('meeting.vote.result', (data: { voteSessionId?: string; counts?: { yes: number; no: number; abstain: number }; total?: number }) => {
      if (data.voteSessionId && data.counts != null && data.total != null) {
        setVoteResult({ voteSessionId: data.voteSessionId, ...data.counts, total: data.total });
      }
    });
    s.on('error', (data: { message?: string }) => {
      setJoinError(data?.message ?? 'Error de conexión');
    });
    return () => {
      s.emit('leave_meeting', { meetingId });
      s.disconnect();
      setSocket(null);
      setSnapshot(null);
      setVoteResult(null);
      setConnected(false);
      setJoinError(null);
    };
  }, [meetingId]);

  return { socket, snapshot, voteResult, connected, joinError };
}
