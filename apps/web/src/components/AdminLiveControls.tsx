'use client';

import { useState } from 'react';
import {
  votingApi,
  timersApi,
  topicsApi,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Topic = { id: string; title: string; type?: string };

type AdminLiveControlsProps = {
  meetingId: string;
  topics: Topic[];
  currentTopicId: string | null;
  activeVoteSession: { id: string; topicTitle: string } | null;
  activeTimer: { id: string; topicId?: string } | null;
  currentTopic: Topic | null;
  onVoteOpened?: () => void;
  onVoteClosed?: () => void;
  onTopicChanged?: () => void;
  onTimerChanged?: () => void;
  className?: string;
};

export function AdminLiveControls({
  meetingId,
  topics,
  currentTopicId,
  activeVoteSession,
  activeTimer,
  currentTopic,
  onVoteOpened,
  onVoteClosed,
  onTopicChanged,
  onTimerChanged,
  className,
}: AdminLiveControlsProps) {
  const [closing, setClosing] = useState(false);
  const [timerDuration, setTimerDuration] = useState('300');
  const [startingTimer, setStartingTimer] = useState(false);
  const [stoppingTimer, setStoppingTimer] = useState(false);

  async function openVote(topicId: string) {
    try {
      await votingApi.open(meetingId, topicId);
      toast.success('Votación abierta.');
      onVoteOpened?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function closeVote(voteSessionId: string) {
    if (!window.confirm('¿Cerrar la votación? No se podrán registrar más votos.')) return;
    setClosing(true);
    try {
      await votingApi.close(meetingId, voteSessionId);
      toast.success('Votación cerrada.');
      onVoteClosed?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setClosing(false);
    }
  }

  async function setCurrentTopic(topicId: string | null) {
    try {
      await topicsApi.setCurrent(meetingId, topicId);
      toast.success(topicId ? 'Tema actual actualizado.' : 'Tema actual borrado.');
      onTopicChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function startTimer(topicId: string) {
    const dur = parseInt(timerDuration, 10) || 300;
    setStartingTimer(true);
    try {
      await timersApi.startTopic(meetingId, topicId, dur);
      toast.success('Timer iniciado.');
      onTimerChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setStartingTimer(false);
    }
  }

  async function stopTimer(timerId: string) {
    setStoppingTimer(true);
    try {
      await timersApi.stop(meetingId, timerId);
      toast.success('Timer detenido.');
      onTimerChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setStoppingTimer(false);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label>Tema actual</Label>
        <Select
          value={currentTopicId ?? '__none__'}
          onValueChange={(v) => setCurrentTopic(v === '__none__' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sin tema —</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Votación</Label>
        {activeVoteSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Abierta: {activeVoteSession.topicTitle}</span>
            <Button
              variant="destructive"
              size="lg"
              disabled={closing}
              onClick={() => closeVote(activeVoteSession.id)}
            >
              {closing ? 'Cerrando...' : 'Cerrar votación'}
            </Button>
          </div>
        ) : (
          currentTopic && (
            <Button
              size="lg"
              onClick={() => openVote(currentTopic.id)}
            >
              Abrir votación: {currentTopic.title}
            </Button>
          )
        )}
      </div>

      <div className="space-y-2">
        <Label>Timer</Label>
        {activeTimer ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={stoppingTimer}
            onClick={() => stopTimer(activeTimer.id)}
          >
            {stoppingTimer ? 'Deteniendo...' : 'Detener timer'}
          </Button>
        ) : (
          currentTopic && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="timer-dur" className="text-xs">Duración (seg)</Label>
                <Input
                  id="timer-dur"
                  type="number"
                  min={60}
                  max={3600}
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(e.target.value)}
                  className="w-24"
                />
              </div>
              <Button
                size="lg"
                disabled={startingTimer}
                onClick={() => startTimer(currentTopic.id)}
              >
                {startingTimer ? 'Iniciando...' : 'Iniciar timer'}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
