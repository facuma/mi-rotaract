'use client';

import { useParams } from 'next/navigation';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { TimerDisplay } from '@/components/TimerDisplay';
import { cn } from '@/lib/utils';
import { MEETING_TYPE_LABELS, MAJORITY_TYPE_LABELS } from '@/lib/meeting-constants';

export default function ProjectorPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected } = useMeetingRoom(meetingId);

  const quorum = snapshot?.quorum;
  const clubs = snapshot?.clubAttendance ?? [];
  const connectedClubs = clubs.filter((c) => c.connected);
  const disconnectedClubs = clubs.filter((c) => !c.connected);
  const hasActiveVote = !!snapshot?.activeVoteSession;
  const hasVoteResult = !!voteResult && !hasActiveVote;
  const typeLabel = snapshot?.meetingType ? MEETING_TYPE_LABELS[snapshot.meetingType] ?? snapshot.meetingType : '';

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar: status + quorum */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          {snapshot && (
            <>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                snapshot.status === 'LIVE' ? 'bg-success/20 text-success' :
                snapshot.status === 'PAUSED' ? 'bg-warning/20 text-warning' :
                'bg-muted text-muted-foreground',
              )}>
                {snapshot.status === 'LIVE' && <span className="size-2 rounded-full bg-success animate-pulse" />}
                {snapshot.status}
              </span>
              {typeLabel && (
                <span className="text-xs text-muted-foreground">{typeLabel}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Quorum indicator */}
          {quorum && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quórum:</span>
              <span className={cn(
                'text-sm font-semibold tabular-nums',
                quorum.met ? 'text-success' : 'text-warning',
              )}>
                {quorum.present}/{quorum.required}
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                quorum.met ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning',
              )}>
                {quorum.met ? '✓' : '✗'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className={cn('size-2 rounded-full', connected ? 'bg-success animate-pulse' : 'bg-destructive')} />
            <span className="text-xs text-muted-foreground">{connected ? 'Conectado' : 'Reconectando...'}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        {!connected && !snapshot && (
          <p className="text-lg text-muted-foreground animate-pulse">Conectando...</p>
        )}

        {snapshot && !hasActiveVote && !hasVoteResult && (
          <>
            {/* Current topic */}
            <div className="text-center space-y-3 transition-all duration-500">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Tema actual
              </p>
              <h1 className="text-[clamp(1.5rem,5vw,3.5rem)] font-bold leading-tight">
                {snapshot.currentTopic?.title ?? '—'}
              </h1>
            </div>

            {/* Timer */}
            {snapshot.activeTimer && (
              <TimerDisplay
                remainingSec={snapshot.activeTimer.remainingSec}
                overtimeSec={snapshot.activeTimer.overtimeSec}
                plannedDurationSec={snapshot.activeTimer.plannedDurationSec}
                size="lg"
              />
            )}

            {/* Current speaker */}
            {snapshot.currentSpeaker && (
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Orador</p>
                <p className="text-[clamp(1rem,3vw,2rem)] font-semibold">
                  {snapshot.currentSpeaker.fullName}
                </p>
              </div>
            )}
          </>
        )}

        {/* Active vote: big display */}
        {snapshot && hasActiveVote && (
          <div className="w-full max-w-3xl space-y-6 text-center">
            <div className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-8 space-y-4 animate-pulse">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                {snapshot.activeVoteSession!.ballotType === 'CANDIDATE' ? 'Elección abierta' : 'Votación abierta'}
                {(snapshot.activeVoteSession!.round ?? 1) > 1 ? ` — Ronda ${snapshot.activeVoteSession!.round}` : ''}
              </p>
              <h1 className="text-[clamp(1.5rem,4vw,3rem)] font-bold">
                {snapshot.activeVoteSession!.topicTitle}
              </h1>
              {snapshot.activeVoteSession!.ballotType === 'CANDIDATE' && (snapshot.activeVoteSession!.candidates?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap justify-center gap-3">
                  {snapshot.activeVoteSession!.candidates!.map((c, i) => (
                    <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium">
                      <span className="text-xs font-bold text-primary">{String.fromCharCode(65 + i)}</span>
                      {c.displayName}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>{snapshot.activeVoteSession!.votingMethod === 'SECRET' ? 'Secreta' : 'Pública'}</span>
                  <span>•</span>
                  <span>{MAJORITY_TYPE_LABELS[snapshot.activeVoteSession!.requiredMajority ?? 'SIMPLE'] ?? 'Mayoría Simple'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vote result */}
        {snapshot && hasVoteResult && voteResult && (
          <div className="w-full max-w-3xl space-y-6">
            <p className="text-sm uppercase tracking-widest text-muted-foreground text-center">
              Resultado{(voteResult.round ?? 1) > 1 ? ` — Ronda ${voteResult.round}` : ''}
            </p>

            {/* Candidate election result */}
            {voteResult.ballotType === 'CANDIDATE' && voteResult.candidateResult ? (
              <div className="space-y-4">
                {voteResult.candidateResult.candidateResults.map((c, i) => {
                  const isWinner = voteResult.candidateResult?.winner?.candidateId === c.candidateId;
                  const maxVotes = voteResult.candidateResult!.candidateResults[0]?.votes ?? 1;
                  const barW = maxVotes > 0 ? Math.round((c.votes / maxVotes) * 100) : 0;
                  return (
                    <div key={c.candidateId} className={cn(
                      'rounded-xl p-4 space-y-2 border',
                      isWinner ? 'border-success/50 bg-success/10' : 'border-border bg-muted/20',
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-[clamp(1rem,2vw,1.5rem)] font-semibold">{c.displayName}</span>
                          {isWinner && (
                            <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">GANADOR</span>
                          )}
                        </div>
                        <span className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tabular-nums">{c.votes}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full transition-all duration-700', isWinner ? 'bg-success' : 'bg-primary/40')}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="text-center">
                  {voteResult.candidateResult.winner ? (
                    <span className="inline-flex items-center rounded-full bg-success/20 px-6 py-2 text-xl font-bold text-success">
                      GANADOR: {voteResult.candidateResult.winner.displayName.toUpperCase()}
                    </span>
                  ) : voteResult.candidateResult.isTied ? (
                    <span className="inline-flex items-center rounded-full bg-warning/20 px-6 py-2 text-xl font-bold text-warning">
                      EMPATE — Desempate RDR (Art. 49)
                    </span>
                  ) : voteResult.candidateResult.needsRunoff ? (
                    <span className="inline-flex items-center rounded-full bg-info/20 px-6 py-2 text-xl font-bold text-info">
                      SEGUNDA VUELTA (Art. 64i)
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              /* YES/NO result */
              <>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-[clamp(2rem,5vw,4rem)] font-bold tabular-nums text-success">{voteResult.yes}</p>
                    <p className="text-sm text-muted-foreground">A favor</p>
                  </div>
                  <div>
                    <p className="text-[clamp(2rem,5vw,4rem)] font-bold tabular-nums text-destructive">{voteResult.no}</p>
                    <p className="text-sm text-muted-foreground">En contra</p>
                  </div>
                  <div>
                    <p className="text-[clamp(2rem,5vw,4rem)] font-bold tabular-nums text-muted-foreground">{voteResult.abstain}</p>
                    <p className="text-sm text-muted-foreground">Abstención</p>
                  </div>
                </div>
                {(voteResult.yes + voteResult.no + voteResult.abstain) > 0 && (
                  <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                    {voteResult.yes > 0 && <div className="bg-success transition-all" style={{ width: `${(voteResult.yes / (voteResult.yes + voteResult.no + voteResult.abstain)) * 100}%` }} />}
                    {voteResult.no > 0 && <div className="bg-destructive transition-all" style={{ width: `${(voteResult.no / (voteResult.yes + voteResult.no + voteResult.abstain)) * 100}%` }} />}
                    {voteResult.abstain > 0 && <div className="bg-muted-foreground/30 transition-all" style={{ width: `${(voteResult.abstain / (voteResult.yes + voteResult.no + voteResult.abstain)) * 100}%` }} />}
                  </div>
                )}
                <div className="text-center">
                  {voteResult.approved !== undefined && voteResult.approved !== null ? (
                    <span className={cn(
                      'inline-flex items-center rounded-full px-4 py-2 text-lg font-bold',
                      voteResult.approved ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive',
                    )}>
                      {voteResult.approved ? 'APROBADA' : 'RECHAZADA'}
                    </span>
                  ) : voteResult.isTied ? (
                    <span className="inline-flex items-center rounded-full bg-warning/20 px-4 py-2 text-lg font-bold text-warning">
                      EMPATE — Desempate RDR
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom bar: club attendance */}
      {snapshot && clubs.length > 0 && !hasActiveVote && !hasVoteResult && (
        <footer className="border-t border-border px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {snapshot.attendanceLocked ? 'Asistencia cerrada' : 'Clubes presentes'}
              </span>
              {snapshot.attendanceLocked && (
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {connectedClubs.length} papeletas
                </span>
              )}
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {connectedClubs.length} conectados / {clubs.length} registrados
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedClubs.map((c) => (
              <span
                key={c.clubId}
                className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success"
              >
                <span className="size-1.5 rounded-full bg-success animate-pulse" />
                {c.clubName}
              </span>
            ))}
            {disconnectedClubs.map((c) => (
              <span
                key={c.clubId}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                {c.clubName}
              </span>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
