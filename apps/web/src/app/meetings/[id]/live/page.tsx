'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {snapshot && (
        <>
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
            />
          )}

          {/* Request to speak */}
          {(snapshot.status === 'LIVE' || snapshot.status === 'PAUSED') && (
            <RequestToSpeakButton meetingId={meetingId} />
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
            />
          )}
        </>
      )}
    </div>
  );
}
