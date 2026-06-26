'use client';

import { useCallback, useState, useEffect } from 'react';
import { votingApi, timersApi, topicsApi, queueApi, meetingsApi, usersApi, clubsApi, motionsApi } from '@/lib/api';
import { VoteReadyModal } from '@/components/meetings/VoteReadyModal';
import { VoteResultSummary } from '@/components/VoteResultSummary';
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
import type { VoteResult, CandidateResult } from '@/hooks/useMeetingRoom';

type Topic = { id: string; title: string; type?: string };
type Speaker = { id: string; fullName: string };

type ActiveVoteSession = {
  id: string;
  topicTitle: string;
  ballotType?: 'YES_NO' | 'CANDIDATE';
  isElection?: boolean;
  round?: number;
  candidates?: { id: string; displayName: string }[];
  votingMethod?: string;
  eligibleClubCount?: number | null;
  votedClubIds?: string[];
};

type AdminLiveControlsProps = {
  meetingId: string;
  topics: Topic[];
  currentTopicId: string | null;
  activeVoteSession: ActiveVoteSession | null;
  activeTimer: { id: string; topicId?: string } | null;
  currentTopic: Topic | null;
  currentSpeaker?: Speaker | null;
  nextSpeaker?: Speaker | null;
  clubsPresent?: number;
  clubAttendance?: { clubId: string; clubName: string; connected: boolean }[];
  attendanceLocked?: boolean;
  voteResult?: VoteResult | null;
  motions?: any[];
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
  clubsPresent,
  clubAttendance = [],
  attendanceLocked = false,
  voteResult,
  motions = [],
  onVoteOpened,
  onVoteClosed,
  onTopicChanged,
  onTimerChanged,
  className,
}: AdminLiveControlsProps) {
  const [closing, setClosing] = useState(false);
  const [confirmCloseVote, setConfirmCloseVote] = useState(false);
  const [votingMethod, setVotingMethod] = useState('PUBLIC');
  const [requiredMajority, setRequiredMajority] = useState('SIMPLE');
  const [ballotType, setBallotType] = useState<'YES_NO' | 'CANDIDATE'>('YES_NO');
  
  type CandidateObj = { displayName: string; userId?: string | null };
  const [candidates, setCandidates] = useState<CandidateObj[]>([{ displayName: '' }, { displayName: '' }]);
  const [voteType, setVoteType] = useState<'GENERAL' | 'RDR' | 'EVENT' | 'CUSTOM_CANDIDATE'>('GENERAL');
  const [availableUsers, setAvailableUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [availableClubs, setAvailableClubs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    usersApi.list().then(setAvailableUsers).catch(() => {});
    clubsApi.list().then(setAvailableClubs).catch(() => {});
  }, []);

  const [showVoteReadyModal, setShowVoteReadyModal] = useState(false);
  const [pendingVoteTopicId, setPendingVoteTopicId] = useState<string | null>(null);
  const [lockingAttendance, setLockingAttendance] = useState(false);
  const [timerDuration, setTimerDuration] = useState('300');
  const [startingTimer, setStartingTimer] = useState(false);
  const [stoppingTimer, setStoppingTimer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rdrChoice, setRdrChoice] = useState<'YES' | 'NO' | null>(null);
  const [rdrCandidateId, setRdrCandidateId] = useState<string | null>(null);

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicType, setNewTopicType] = useState('DISCUSSION');
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [motionVoteMethod, setMotionVoteMethod] = useState<Record<string, 'PUBLIC' | 'SECRET'>>({});
  const [motionVoteMajority, setMotionVoteMajority] = useState<Record<string, 'SIMPLE' | 'ABSOLUTE' | 'TWO_THIRDS' | 'THREE_QUARTERS'>>({});

  async function handleCreateTopic() {
    if (!newTopicTitle.trim()) {
      toast.error('El título del tema es requerido.');
      return;
    }
    setCreatingTopic(true);
    try {
      await topicsApi.create(meetingId, {
        title: newTopicTitle.trim(),
        type: newTopicType as any,
      });
      toast.success('Tema creado.');
      setNewTopicTitle('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear tema.');
    } finally {
      setCreatingTopic(false);
    }
  }

  async function handleLockAttendance() {
    setLockingAttendance(true);
    try {
      await meetingsApi.lockAttendance(meetingId);
      toast.success('Asistencia cerrada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setLockingAttendance(false);
    }
  }

  function handleOpenVoteClick(topicId: string) {
    if (ballotType === 'CANDIDATE') {
      const valid = candidates.filter((c) => c.displayName.trim());
      if (valid.length < 1) {
        toast.error('Ingresá al menos un candidato.');
        return;
      }
    }
    const disconnected = clubAttendance.filter((c) => !c.connected);
    if (disconnected.length > 0 && clubAttendance.length > 0) {
      setPendingVoteTopicId(topicId);
      setShowVoteReadyModal(true);
    } else {
      openVote(topicId);
    }
  }

  const handleAllPresent = useCallback(() => {
    if (pendingVoteTopicId) {
      setShowVoteReadyModal(false);
      openVote(pendingVoteTopicId);
      setPendingVoteTopicId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVoteTopicId]);

  async function openVote(topicId: string) {
    const opts: Parameters<typeof votingApi.open>[2] = {
      votingMethod: votingMethod as 'PUBLIC' | 'SECRET',
      requiredMajority,
      ballotType,
    };
    if (ballotType === 'CANDIDATE') {
      opts.candidates = candidates
        .filter((c) => c.displayName.trim())
        .map((c) => ({
          displayName: c.displayName.trim(),
          userId: c.userId || undefined,
        }));
      opts.isElection = true;
      opts.electionType = voteType === 'RDR' ? 'RDR' : voteType === 'EVENT' ? 'EVENT' : undefined;
    }
    try {
      await votingApi.open(meetingId, topicId, opts);
      setShowVoteReadyModal(false);
      setPendingVoteTopicId(null);
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

  async function handleOpenRunoff(previousSessionId: string) {
    setActionLoading(true);
    try {
      await votingApi.openRunoff(meetingId, previousSessionId);
      toast.success('Segunda vuelta abierta (Art. 64i).');
      onVoteOpened?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRdrTiebreaker(voteSessionId: string) {
    if (!rdrChoice) { toast.error('Seleccioná una opción de desempate.'); return; }
    setActionLoading(true);
    try {
      await votingApi.rdrTiebreaker(meetingId, voteSessionId, rdrChoice);
      toast.success('Desempate del RDR aplicado (Art. 49).');
      setRdrChoice(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRdrCandidateTiebreaker(voteSessionId: string) {
    if (!rdrCandidateId) { toast.error('Seleccioná el candidato ganador.'); return; }
    setActionLoading(true);
    try {
      await votingApi.rdrCandidateTiebreaker(meetingId, voteSessionId, rdrCandidateId);
      toast.success('Desempate del RDR aplicado (Art. 49).');
      setRdrCandidateId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(false);
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

  const tiedCandidates: CandidateResult[] = voteResult?.candidateResult
    ? voteResult.candidateResult.candidateResults.filter(
        (c) => c.votes === voteResult.candidateResult!.candidateResults[0]?.votes && c.votes > 0,
      )
    : [];

  const currentTopicIndex = topics.findIndex((t) => t.id === currentTopicId);
  let previousNormalTopic: Topic | null = null;
  if (currentTopicIndex > -1) {
    for (let i = currentTopicIndex - 1; i >= 0; i--) {
      const t = topics[i];
      if (t.type !== 'VOTING' && !t.title?.startsWith('Moción:')) {
        previousNormalTopic = t;
        break;
      }
    }
  }
  const currentTopicIsMotion = currentTopic?.type === 'VOTING' || currentTopic?.title?.startsWith('Moción:');
  const showReturnButton = !!(currentTopicIsMotion && previousNormalTopic);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Attendance section */}
      {clubAttendance.length > 0 && (
        <FormSection
          title="Asistencia"
          description={attendanceLocked ? 'Asistencia cerrada.' : 'Clubes conectados a la reunión.'}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm tabular-nums">
                {clubAttendance.filter((c) => c.connected).length} de {clubAttendance.length} conectados
              </span>
              {attendanceLocked ? (
                <Badge variant="secondary" className="text-xs">Cerrada</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lockingAttendance}
                  onClick={handleLockAttendance}
                >
                  {lockingAttendance ? 'Cerrando...' : 'Cerrar asistencia'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {clubAttendance.map((c) => (
                <span
                  key={c.clubId}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                    c.connected
                      ? 'border border-success/30 bg-success/10 text-success'
                      : 'border border-border bg-muted/30 text-muted-foreground',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', c.connected ? 'bg-success animate-pulse' : 'bg-muted-foreground/50')} />
                  {c.clubName}
                </span>
              ))}
            </div>
          </div>
        </FormSection>
      )}

      {/* Topic section */}
      <FormSection title="Tema actual" description="Seleccioná el tema en discusión.">
        <div className="space-y-3">
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
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="pt-3 border-t border-border mt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Creación Rápida de Temas</p>
            <div className="flex gap-1.5 flex-col sm:flex-row">
              <Input
                placeholder="Nombre del nuevo tema..."
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <div className="flex gap-1.5">
                <Select value={newTopicType} onValueChange={setNewTopicType}>
                  <SelectTrigger className="h-8 text-xs w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCUSSION">Debate</SelectItem>
                    <SelectItem value="VOTING">Votación</SelectItem>
                    <SelectItem value="INFORMATIVE">Informativo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs shrink-0"
                  onClick={handleCreateTopic}
                  disabled={creatingTopic}
                >
                  {creatingTopic ? '...' : 'Crear'}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
              <Button variant="ghost" size="sm" onClick={() => handleSetCurrentSpeaker(null)}>
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
              <Button variant="outline" size="sm" onClick={promoteNextSpeaker}>
                Dar palabra
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      {/* Voting section */}
      <FormSection title="Votación" description="Abrí o cerrá votaciones (Art. 44-50).">
        {activeVoteSession ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                {activeVoteSession.ballotType === 'CANDIDATE' ? 'Elección' : 'Votación'} abierta
                {(activeVoteSession.round ?? 1) > 1 ? ` — Ronda ${activeVoteSession.round}` : ''}
              </Badge>
              <span className="text-sm flex-1 truncate">{activeVoteSession.topicTitle}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmCloseVote(true)}
              >
                Cerrar votación
              </Button>
            </div>
            {activeVoteSession.ballotType === 'CANDIDATE' && (activeVoteSession.candidates?.length ?? 0) > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium">Candidatos:</p>
                {activeVoteSession.candidates!.map((c, i) => (
                  <p key={c.id}>{String.fromCharCode(65 + i)}. {c.displayName}</p>
                ))}
              </div>
            )}

            {/* Voto manual para clubes faltantes */}
            {(() => {
              const pendingClubs = clubAttendance.filter(
                (c) => !activeVoteSession.votedClubIds?.includes(c.clubId)
              );
              if (pendingClubs.length === 0 || activeVoteSession.votingMethod === 'SECRET') return null;
              return (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Clubes pendientes de votación ({pendingClubs.length}):
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pendingClubs.map((club) => (
                      <div
                        key={club.clubId}
                        className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-xs font-medium truncate flex-1">
                          {club.clubName}
                          {!club.connected && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              (Desconectado)
                            </span>
                          )}
                        </span>
                        {activeVoteSession.ballotType === 'CANDIDATE' ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Select
                              onValueChange={async (candidateId) => {
                                try {
                                  await votingApi.manual(
                                    meetingId,
                                    activeVoteSession.id,
                                    club.clubId,
                                    candidateId === 'ABSTAIN' ? 'ABSTAIN' : 'YES',
                                    candidateId === 'ABSTAIN' ? undefined : candidateId,
                                  );
                                  toast.success(`Voto manual registrado para ${club.clubName}`);
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : 'Error al registrar voto',
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue placeholder="Registrar voto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeVoteSession.candidates?.map((cand) => (
                                  <SelectItem key={cand.id} value={cand.id}>
                                    {cand.displayName}
                                  </SelectItem>
                                ))}
                                <SelectItem value="ABSTAIN">Abstención</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] hover:bg-success/15 hover:text-success"
                              onClick={async () => {
                                try {
                                  await votingApi.manual(
                                    meetingId,
                                    activeVoteSession.id,
                                    club.clubId,
                                    'YES',
                                  );
                                  toast.success(`Voto A favor registrado para ${club.clubName}`);
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : 'Error al registrar voto',
                                  );
                                }
                              }}
                            >
                              Sí
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] hover:bg-destructive/15 hover:text-destructive"
                              onClick={async () => {
                                try {
                                  await votingApi.manual(
                                    meetingId,
                                    activeVoteSession.id,
                                    club.clubId,
                                    'NO',
                                  );
                                  toast.success(`Voto En contra registrado para ${club.clubName}`);
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : 'Error al registrar voto',
                                  );
                                }
                              }}
                            >
                              No
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] hover:bg-muted-foreground/15 text-muted-foreground"
                              onClick={async () => {
                                try {
                                  await votingApi.manual(
                                    meetingId,
                                    activeVoteSession.id,
                                    club.clubId,
                                    'ABSTAIN',
                                  );
                                  toast.success(`Abstención registrada para ${club.clubName}`);
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : 'Error al registrar voto',
                                  );
                                }
                              }}
                            >
                              Abs
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <>
            {showReturnButton && (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentTopic(previousNormalTopic!.id)}
                  className="w-full flex items-center justify-center gap-1.5 border-dashed border-primary text-primary hover:bg-primary/5 font-medium"
                >
                  ↩ Volver a tema: {previousNormalTopic!.title}
                </Button>
              </div>
            )}

            {/* Post-close result + actions */}
            {voteResult && (
              <div className="space-y-3 mb-4">
                <VoteResultSummary
                  yes={voteResult.yes}
                  no={voteResult.no}
                  abstain={voteResult.abstain}
                  total={voteResult.total}
                  approved={voteResult.approved}
                  isTied={voteResult.isTied}
                  requiredMajority={voteResult.requiredMajority}
                  ballotType={voteResult.ballotType}
                  round={voteResult.round}
                  candidateResult={voteResult.candidateResult}
                  rdrTiebreakerUsed={voteResult.rdrTiebreakerUsed}
                />

                {/* RDR Tiebreaker — YES/NO vote */}
                {voteResult.isTied && voteResult.ballotType !== 'CANDIDATE' && !voteResult.rdrTiebreakerUsed && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-warning-foreground">Desempate RDR (Art. 49)</p>
                    <p className="text-xs text-muted-foreground">El RDR tiene voto de calidad en caso de empate.</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={rdrChoice === 'YES' ? 'default' : 'outline'}
                        onClick={() => setRdrChoice('YES')}
                        className={rdrChoice === 'YES' ? 'border-success bg-success hover:bg-success/90' : ''}
                      >
                        A favor
                      </Button>
                      <Button
                        size="sm"
                        variant={rdrChoice === 'NO' ? 'default' : 'outline'}
                        onClick={() => setRdrChoice('NO')}
                        className={rdrChoice === 'NO' ? 'border-destructive bg-destructive hover:bg-destructive/90' : ''}
                      >
                        En contra
                      </Button>
                      <Button
                        size="sm"
                        disabled={!rdrChoice || actionLoading}
                        onClick={() => handleRdrTiebreaker(voteResult.voteSessionId)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                )}

                {/* RDR Tiebreaker — Candidate vote */}
                {voteResult.candidateResult?.isTied && !voteResult.rdrTiebreakerUsed && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-warning-foreground">Desempate RDR — Candidatos (Art. 49)</p>
                    <p className="text-xs text-muted-foreground">Empate entre candidatos. El RDR elige el ganador.</p>
                    <div className="space-y-1">
                      {tiedCandidates.map((c) => (
                        <button
                          key={c.candidateId}
                          onClick={() => setRdrCandidateId(c.candidateId)}
                          className={cn(
                            'w-full text-left rounded px-3 py-2 text-sm border transition-colors',
                            rdrCandidateId === c.candidateId
                              ? 'border-primary bg-primary/10 font-semibold'
                              : 'border-border bg-background hover:bg-muted',
                          )}
                        >
                          {c.displayName} ({c.votes} votos)
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      disabled={!rdrCandidateId || actionLoading}
                      onClick={() => handleRdrCandidateTiebreaker(voteResult.voteSessionId)}
                    >
                      Confirmar ganador
                    </Button>
                  </div>
                )}

                {/* Open runoff */}
                {voteResult.candidateResult?.needsRunoff && !voteResult.candidateResult?.winner && (
                  <div className="rounded-lg border border-info/40 bg-info/10 p-3 space-y-2">
                    <p className="text-xs font-semibold">Segunda vuelta requerida (Art. 64i)</p>
                    <p className="text-xs text-muted-foreground">
                      Ningún candidato obtuvo la mayoría requerida. Se realizará una segunda vuelta entre los dos más votados.
                    </p>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleOpenRunoff(voteResult.voteSessionId)}
                    >
                      {actionLoading ? 'Abriendo...' : 'Abrir segunda vuelta'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Open new vote */}
            {currentTopic ? (
              <div className="space-y-3">
                {/* Vote type selector */}
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Votación</Label>
                  <Select
                    value={voteType}
                    onValueChange={(val: any) => {
                      setVoteType(val);
                      if (val === 'GENERAL') {
                        setBallotType('YES_NO');
                        setRequiredMajority('SIMPLE');
                      } else {
                        setBallotType('CANDIDATE');
                        setRequiredMajority('ABSOLUTE');
                        if (candidates.length < 2) {
                          setCandidates([{ displayName: '' }, { displayName: '' }]);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">Moción General (Sí/No/Abstención)</SelectItem>
                      <SelectItem value="RDR">Elección de RDR (Art. 64)</SelectItem>
                      <SelectItem value="EVENT">Elección de Sede (Eventos Distritales)</SelectItem>
                      <SelectItem value="CUSTOM_CANDIDATE">Elección Personalizada de Candidatos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Candidate inputs */}
                {ballotType === 'CANDIDATE' && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Candidatos ({voteType === 'RDR' ? 'Candidatos RDR' : voteType === 'EVENT' ? 'Clubes Postulados' : 'Candidatos'})
                    </Label>
                    {candidates.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs w-5 font-medium text-muted-foreground">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <div className="flex-1 relative">
                          <Input
                            list={`cand-suggestions-${i}`}
                            placeholder={
                              voteType === 'RDR' ? 'Buscar usuario o escribir nombre...' :
                              voteType === 'EVENT' ? 'Buscar club o escribir nombre...' :
                              `Candidato ${String.fromCharCode(65 + i)}`
                            }
                            value={c.displayName}
                            onChange={(e) => {
                              const val = e.target.value;
                              let matchedUserId: string | null = null;
                              if (voteType === 'RDR') {
                                const match = availableUsers.find(
                                  (u) => u.fullName === val || `${u.fullName} (${u.email})` === val
                                );
                                if (match) {
                                  matchedUserId = match.id;
                                }
                              }
                              const next = [...candidates];
                              next[i] = { displayName: val, userId: matchedUserId };
                              setCandidates(next);
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (voteType === 'RDR') {
                                const match = availableUsers.find(
                                  (u) => u.fullName === val || `${u.fullName} (${u.email})` === val
                                );
                                if (match) {
                                  const next = [...candidates];
                                  next[i] = { displayName: match.fullName, userId: match.id };
                                  setCandidates(next);
                                }
                              }
                            }}
                            className="h-8 text-sm"
                          />
                          <datalist id={`cand-suggestions-${i}`}>
                            {voteType === 'RDR' &&
                              availableUsers.map((u) => (
                                <option key={u.id} value={`${u.fullName} (${u.email})`} />
                              ))}
                            {voteType === 'EVENT' &&
                              availableClubs.map((club) => (
                                <option key={club.id} value={club.name} />
                              ))}
                          </datalist>
                        </div>
                        {candidates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCandidates(candidates.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => setCandidates([...candidates, { displayName: '' }])}
                    >
                      + Agregar candidato
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Select value={votingMethod} onValueChange={setVotingMethod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Pública</SelectItem>
                      <SelectItem value="SECRET">Secreta</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {voteType === 'CUSTOM_CANDIDATE' && ballotType === 'CANDIDATE' && (
                    <Select value={requiredMajority} onValueChange={setRequiredMajority}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMPLE">Mayoría Simple</SelectItem>
                        <SelectItem value="ABSOLUTE">Mayoría Absoluta</SelectItem>
                        <SelectItem value="TWO_THIRDS">Dos Tercios</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {voteType === 'RDR' && (
                    <Select value={requiredMajority} onValueChange={setRequiredMajority}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABSOLUTE">Mayoría Absoluta (Art. 64)</SelectItem>
                        <SelectItem value="TWO_THIRDS">Dos Tercios (Art. 65-66)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {voteType === 'EVENT' && (
                    <Select value={requiredMajority} onValueChange={setRequiredMajority}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABSOLUTE">Mayoría Absoluta (Art. 64/47)</SelectItem>
                        <SelectItem value="TWO_THIRDS">Dos Tercios</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {voteType === 'GENERAL' && ballotType === 'YES_NO' && (
                    <Select value={requiredMajority} onValueChange={setRequiredMajority}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMPLE">Mayoría Simple</SelectItem>
                        <SelectItem value="ABSOLUTE">Mayoría Absoluta</SelectItem>
                        <SelectItem value="TWO_THIRDS">Dos Tercios</SelectItem>
                        <SelectItem value="THREE_QUARTERS">Tres Cuartos</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {clubsPresent !== undefined && clubsPresent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {clubsPresent} papeleta{clubsPresent === 1 ? '' : 's'} (clubes presentes)
                  </p>
                )}

                <Button onClick={() => handleOpenVoteClick(currentTopic.id)} className="w-full">
                  Abrir votación: {currentTopic.title}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Seleccioná un tema primero.</p>
            )}
          </>
        )}
      </FormSection>

      {/* Motions section */}
      {motions && (
        <FormSection title="Mociones" description="Cola de mociones de la reunión.">
          {motions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg bg-muted/5">
              No hay mociones en cola.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {motions.map((m) => {
                const isSeconded = m.status === 'SECONDED';
                const isProposed = m.status === 'PROPOSED';
                const isVoting = m.status === 'VOTING';
                const isApproved = m.status === 'APPROVED';
                const isRejected = m.status === 'REJECTED';
                
                return (
                  <div key={m.id} className="rounded-lg border border-border p-3 space-y-2 bg-muted/10 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{m.title}</p>
                        {m.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Propone: <span className="font-semibold">{m.proposedByClubName}</span>
                          {m.secondedByClubName && (
                            <> • Secunda: <span className="font-semibold">{m.secondedByClubName}</span></>
                          )}
                        </p>
                      </div>
                      <Badge className="shrink-0 text-[10px] px-1.5 py-0" variant={isApproved ? 'success' : isRejected ? 'destructive' : isSeconded ? 'info' : 'outline'}>
                        {isApproved ? 'APROBADA' : isRejected ? 'RECHAZADA' : isVoting ? 'VOTANDO' : isSeconded ? 'SEGUNDADA' : 'PROPUESTA'}
                      </Badge>
                    </div>

                    {isSeconded && (
                      <div className="flex gap-1.5 justify-end pt-1.5 border-t border-border/50 flex-wrap">
                        <Select
                          value={motionVoteMethod[m.id] || 'PUBLIC'}
                          onValueChange={(val) => setMotionVoteMethod({ ...motionVoteMethod, [m.id]: val as any })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PUBLIC">Público</SelectItem>
                            <SelectItem value="SECRET">Secreto</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={motionVoteMajority[m.id] || 'SIMPLE'}
                          onValueChange={(val) => setMotionVoteMajority({ ...motionVoteMajority, [m.id]: val as any })}
                        >
                          <SelectTrigger className="h-7 text-[10px] w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SIMPLE">Mayoría Simple</SelectItem>
                            <SelectItem value="ABSOLUTE">Absoluta</SelectItem>
                            <SelectItem value="TWO_THIRDS">Dos Tercios</SelectItem>
                            <SelectItem value="THREE_QUARTERS">Tres Cuartos</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          disabled={actionLoading}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              await motionsApi.launchVote(meetingId, m.id, {
                                votingMethod: (motionVoteMethod[m.id] || 'PUBLIC') as any,
                                requiredMajority: (motionVoteMajority[m.id] || 'SIMPLE') as any,
                              });
                              toast.success('Votación de moción iniciada.');
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Error al lanzar voto');
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                        >
                          Votar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </FormSection>
      )}

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
              <Button disabled={startingTimer} onClick={() => startTimer(currentTopic.id)}>
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
            <Button variant="outline" onClick={() => setConfirmCloseVote(false)}>
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

      {/* Vote ready modal */}
      <VoteReadyModal
        open={showVoteReadyModal}
        onOpenChange={setShowVoteReadyModal}
        clubAttendance={clubAttendance}
        topicTitle={currentTopic?.title ?? ''}
        onContinue={() => {
          if (pendingVoteTopicId) openVote(pendingVoteTopicId);
        }}
        onAllPresent={handleAllPresent}
      />
    </div>
  );
}
