'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { useAuthState } from '@/context/AuthContext';
import { VoteActionPanel } from '@/components/VoteActionPanel';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { CurrentTopicCard } from '@/components/CurrentTopicCard';
import { SpeakingQueueList } from '@/components/SpeakingQueueList';
import { RequestToSpeakButton } from '@/components/RequestToSpeakButton';
import { QuorumIndicator } from '@/components/meetings/QuorumIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export default function ParticipantLivePage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected, joinError } = useMeetingRoom(meetingId);
  const { user } = useAuthState();

  const ownRequest =
    user && snapshot?.speakingQueue
      ? snapshot.speakingQueue.find((req) => req.userId === user.id)
      : null;
  const isRequested = !!ownRequest;
  const requestId = ownRequest?.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/meetings/${meetingId}`}>← Volver</Link>
          </Button>
          <h1 className="text-lg font-semibold">Sala en vivo</h1>
          {snapshot && <StatusBadge status={snapshot.status} />}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'size-2 rounded-full',
              connected ? 'bg-success animate-pulse' : 'bg-destructive',
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {joinError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium">{joinError}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {!snapshot && !joinError && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      )}

      {snapshot && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Area (Left Column) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Quorum indicator */}
            {snapshot.quorum && (
              <QuorumIndicator
                required={snapshot.quorum.required}
                present={snapshot.quorum.present}
                met={snapshot.quorum.met}
                isInformationalOnly={snapshot.quorum.isInformationalOnly}
              />
            )}

            {/* Current topic */}
            <CurrentTopicCard
              topic={snapshot.currentTopic ?? { title: '—' }}
              timer={snapshot.activeTimer ?? null}
              topics={snapshot.topics}
              currentTopicId={snapshot.currentTopicId}
            />

            {/* Active vote */}
            {snapshot.activeVoteSession && (
              <VoteActionPanel
                meetingId={meetingId}
                voteSessionId={snapshot.activeVoteSession.id}
                topicTitle={snapshot.activeVoteSession.topicTitle}
                ballotType={snapshot.activeVoteSession.ballotType ?? 'YES_NO'}
                candidates={snapshot.activeVoteSession.candidates ?? []}
                initialVote={snapshot.ownVote}
              />
            )}

            {/* Request to speak */}
            {(snapshot.status === 'LIVE' || snapshot.status === 'PAUSED') && (
              <RequestToSpeakButton
                meetingId={meetingId}
                isRequested={isRequested}
                requestId={requestId}
              />
            )}

            {/* Speaking queue */}
            <SpeakingQueueList
              items={snapshot.speakingQueue ?? []}
              currentSpeaker={snapshot.currentSpeaker}
              nextSpeaker={snapshot.nextSpeaker}
            />

            {/* Vote results */}
            {voteResult && !snapshot.activeVoteSession && (
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
            )}
          </div>

          {/* Sidebar Area (Right Column) */}
          <div className="space-y-6 lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
            {/* Interactive Agenda */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orden del Día</h3>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="divide-y divide-border">
                  {snapshot.topics.map((t, idx) => {
                    const isCurrent = t.id === snapshot.currentTopicId;
                    const isDone = t.status === 'DONE';
                    const isActive = t.status === 'ACTIVE' || isCurrent;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                          isActive ? 'bg-primary/5 border-l-2 border-primary font-medium' : 'bg-transparent',
                          isDone ? 'opacity-60' : '',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0',
                            isDone ? 'bg-success/20 text-success' :
                            isActive ? 'bg-primary text-primary-foreground' :
                            'bg-muted text-muted-foreground',
                          )}
                        >
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <span className="flex-1 truncate">{t.title}</span>
                        {isActive && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary animate-pulse">
                            Activo
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Attendance indicator */}
            {snapshot.clubAttendance && snapshot.clubAttendance.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clubes Presentes</h3>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{snapshot.clubAttendance.filter((c) => c.connected).length} de {snapshot.clubAttendance.length} conectados</span>
                    {snapshot.attendanceLocked && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Cerrada</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {snapshot.clubAttendance.map((c) => (
                      <span
                        key={c.clubId}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border',
                          c.connected
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-border bg-muted/30 text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            c.connected ? 'bg-success animate-pulse' : 'bg-muted-foreground/50',
                          )}
                        />
                        {c.clubName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
