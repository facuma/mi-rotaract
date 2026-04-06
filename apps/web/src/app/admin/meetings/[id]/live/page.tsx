'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { CurrentTopicCard } from '@/components/CurrentTopicCard';
import { SpeakingQueueList } from '@/components/SpeakingQueueList';
import { AdminLiveControls } from '@/components/AdminLiveControls';
import { QuorumIndicator } from '@/components/meetings/QuorumIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export default function AdminLivePage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected, joinError } = useMeetingRoom(meetingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/meetings/${meetingId}`}>← Volver</Link>
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
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      )}

      {/* Main content */}
      {snapshot && (
        <div className="space-y-6">
          {/* Quorum indicator for district meetings */}
          {snapshot.quorum && (
            <QuorumIndicator
              required={snapshot.quorum.required}
              present={snapshot.quorum.present}
              met={snapshot.quorum.met}
              isInformationalOnly={snapshot.quorum.isInformationalOnly}
            />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: monitoring */}
          <div className="space-y-6 lg:col-span-2">
            <CurrentTopicCard
              topic={snapshot.currentTopic ?? { title: '—' }}
              timer={snapshot.activeTimer ?? null}
              topics={snapshot.topics}
              currentTopicId={snapshot.currentTopicId}
            />

            <SpeakingQueueList
              items={snapshot.speakingQueue ?? []}
              meetingId={meetingId}
              isAdmin
              currentSpeaker={snapshot.currentSpeaker}
              nextSpeaker={snapshot.nextSpeaker}
            />

            {voteResult && (
              <VoteResultSummary
                yes={voteResult.yes}
                no={voteResult.no}
                abstain={voteResult.abstain}
                total={voteResult.total}
              />
            )}
          </div>

          {/* Right column: controls */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Controles</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminLiveControls
                  meetingId={meetingId}
                  topics={snapshot.topics}
                  currentTopicId={snapshot.currentTopicId}
                  currentTopic={snapshot.currentTopic}
                  activeVoteSession={snapshot.activeVoteSession ?? null}
                  activeTimer={snapshot.activeTimer ?? null}
                  currentSpeaker={snapshot.currentSpeaker}
                  nextSpeaker={snapshot.nextSpeaker}
                  clubsPresent={snapshot.quorum?.present ?? 0}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
