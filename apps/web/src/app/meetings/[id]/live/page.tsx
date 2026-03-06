'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { VoteActionPanel } from '@/components/VoteActionPanel';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { CurrentTopicCard } from '@/components/CurrentTopicCard';
import { SpeakingQueueList } from '@/components/SpeakingQueueList';
import { RequestToSpeakButton } from '@/components/RequestToSpeakButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ParticipantLivePage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected, joinError } = useMeetingRoom(meetingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/meetings/${meetingId}`}>← Volver</Link>
        </Button>
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>
      {joinError && (
        <p className="text-sm text-destructive font-medium">{joinError}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Sala en vivo</CardTitle>
          <CardDescription>Seguí el desarrollo de la reunión en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!snapshot && !joinError && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}
          {snapshot && (
            <>
              <CurrentTopicCard
                topic={snapshot.currentTopic ?? { title: '—' }}
                timer={snapshot.activeTimer ?? null}
              />
              {(snapshot.status === 'LIVE' || snapshot.status === 'PAUSED') && (
                <RequestToSpeakButton meetingId={meetingId} />
              )}
              <SpeakingQueueList
                items={snapshot.speakingQueue ?? []}
              />
              {snapshot.activeVoteSession && (
                <VoteActionPanel
                  meetingId={meetingId}
                  voteSessionId={snapshot.activeVoteSession.id}
                  topicTitle={snapshot.activeVoteSession.topicTitle}
                />
              )}
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
        </CardContent>
      </Card>
    </div>
  );
}
