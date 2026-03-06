'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMeetingRoom } from '@/hooks/useMeetingRoom';
import { VoteResultSummary } from '@/components/VoteResultSummary';
import { CurrentTopicCard } from '@/components/CurrentTopicCard';
import { SpeakingQueueList } from '@/components/SpeakingQueueList';
import { AdminLiveControls } from '@/components/AdminLiveControls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminLivePage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { snapshot, voteResult, connected, joinError } = useMeetingRoom(meetingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/meetings/${meetingId}`}>← Volver a reunión</Link>
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
          <CardTitle>Sala en vivo (Secretaría)</CardTitle>
          <CardDescription>Control de la reunión, votaciones y tema actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!snapshot && (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}
          {snapshot && (
            <>
              <CurrentTopicCard
                topic={snapshot.currentTopic ?? { title: '—' }}
                timer={snapshot.activeTimer ?? null}
              />
              <AdminLiveControls
                meetingId={meetingId}
                topics={snapshot.topics}
                currentTopicId={snapshot.currentTopicId}
                currentTopic={snapshot.currentTopic}
                activeVoteSession={snapshot.activeVoteSession ?? null}
                activeTimer={snapshot.activeTimer ?? null}
              />
              <SpeakingQueueList
                items={snapshot.speakingQueue ?? []}
                isAdmin
              />
              {voteResult && (
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
