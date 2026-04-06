'use client';

import { useState } from 'react';
import { votingApi, timersApi, topicsApi, queueApi } from '@/lib/api';
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
import { FormSection } from '@/components/ui/form-section';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Topic = { id: string; title: string; type?: string };
type Speaker = { id: string; fullName: string };

type AdminLiveControlsProps = {
  meetingId: string;
  topics: Topic[];
  currentTopicId: string | null;
  activeVoteSession: { id: string; topicTitle: string } | null;
  activeTimer: { id: string; topicId?: string } | null;
  currentTopic: Topic | null;
  currentSpeaker?: Speaker | null;
  nextSpeaker?: Speaker | null;
  onVoteOpened?: () => void;
  onVoteClosed?: () => void;
  onTopicChanged?: () => void;
  onTimerChanged?: () => void;
  className?: string;
};

const TIMER_PRESETS = [
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

export function AdminLiveControls({
  meetingId,
  topics,
  currentTopicId,
  activeVoteSession,
  activeTimer,
  currentTopic,
  currentSpeaker,
  nextSpeaker,
  onVoteOpened,
  onVoteClosed,
  onTopicChanged,
  onTimerChanged,
  className,
}: AdminLiveControlsProps) {
  const [closing, setClosing] = useState(false);
  const [confirmCloseVote, setConfirmCloseVote] = useState(false);
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
    setClosing(true);
    try {
      await votingApi.close(meetingId, voteSessionId);
      toast.success('Votación cerrada.');
      setConfirmCloseVote(false);
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

  async function handleSetCurrentSpeaker(userId: string | null) {
    try {
      await queueApi.setCurrentSpeaker(meetingId, userId);
      toast.success(userId ? 'Orador actualizado.' : 'Orador quitado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  async function promoteNextSpeaker() {
    if (!nextSpeaker) return;
    try {
      await queueApi.setCurrentSpeaker(meetingId, nextSpeaker.id);
      toast.success('Se dio la palabra al siguiente orador.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Topic section */}
      <FormSection title="Tema actual" description="Seleccioná el tema en discusión.">
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
      </FormSection>

      {/* Speaker section */}
      <FormSection title="Orador" description="Controlá quién tiene la palabra.">
        <div className="space-y-2">
          {currentSpeaker ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">{currentSpeaker.fullName}</span>
                <Badge variant="default" className="text-xs">Hablando</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetCurrentSpeaker(null)}
              >
                Quitar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin orador actual.</p>
          )}

          {nextSpeaker && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{nextSpeaker.fullName}</span>
                <Badge variant="secondary" className="text-xs">Siguiente</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={promoteNextSpeaker}
              >
                Dar palabra
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      {/* Voting section */}
      <FormSection title="Votación" description="Abrí o cerrá votaciones en el tema actual.">
        {activeVoteSession ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Abierta</Badge>
            <span className="text-sm flex-1">{activeVoteSession.topicTitle}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmCloseVote(true)}
            >
              Cerrar votación
            </Button>
          </div>
        ) : currentTopic ? (
          <Button
            onClick={() => openVote(currentTopic.id)}
          >
            Abrir votación: {currentTopic.title}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Seleccioná un tema primero.</p>
        )}
      </FormSection>

      {/* Timer section */}
      <FormSection title="Timer" description="Controlá el tiempo del tema actual.">
        {activeTimer ? (
          <Button
            variant="secondary"
            disabled={stoppingTimer}
            onClick={() => stopTimer(activeTimer.id)}
          >
            {stoppingTimer ? 'Deteniendo...' : 'Detener timer'}
          </Button>
        ) : currentTopic ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TIMER_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={timerDuration === String(preset.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimerDuration(String(preset.value))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="timer-dur" className="text-xs">Segundos</Label>
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
                disabled={startingTimer}
                onClick={() => startTimer(currentTopic.id)}
              >
                {startingTimer ? 'Iniciando...' : 'Iniciar timer'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Seleccioná un tema primero.</p>
        )}
      </FormSection>

      {/* Confirm close vote dialog */}
      <Dialog open={confirmCloseVote} onOpenChange={setConfirmCloseVote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar votación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro? No se podrán registrar más votos una vez cerrada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCloseVote(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={closing}
              onClick={() => activeVoteSession && closeVote(activeVoteSession.id)}
            >
              {closing ? 'Cerrando...' : 'Cerrar votación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
