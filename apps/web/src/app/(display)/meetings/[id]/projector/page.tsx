'use client';

import { useParams } from 'next/navigation';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { TimerDisplay } from '@/components/TimerDisplay';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ProjectorPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected } = useMeetingRoom(meetingId);

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Top status bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
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
            {connected ? 'Conectado' : 'Reconectando...'}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {!connected && !snapshot && (
          <p className="text-lg text-muted-foreground animate-pulse">Conectando...</p>
        )}

        {snapshot && (
          <>
            {/* Current topic */}
            <div className="text-center space-y-4 transition-all duration-500">
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
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Orador
                </p>
                <p className="text-[clamp(1rem,3vw,2rem)] font-semibold">
                  {snapshot.currentSpeaker.fullName}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom: vote session or results */}
      {snapshot && (snapshot.activeVoteSession || (voteResult && !snapshot.activeVoteSession)) && (
        <footer className="border-t border-border p-6">
          {snapshot.activeVoteSession && (
            <div className="rounded-xl border-2 border-primary p-6 text-center animate-pulse">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Votación abierta
              </p>
              <p className="text-[clamp(1rem,3vw,2rem)] font-bold">
                {snapshot.activeVoteSession.topicTitle}
              </p>
            </div>
          )}

          {voteResult && !snapshot.activeVoteSession && (
            <VoteResultSummary
              yes={voteResult.yes}
              no={voteResult.no}
              abstain={voteResult.abstain}
              total={voteResult.total}
            />
          )}
        </footer>
      )}
    </div>
  );
}
