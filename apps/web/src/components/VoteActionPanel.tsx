'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { votingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function VoteActionPanel({
  meetingId,
  voteSessionId,
  topicTitle,
  onVoted,
}: {
  meetingId: string;
  voteSessionId: string;
  topicTitle: string;
  onVoted?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function submit(choice: 'YES' | 'NO' | 'ABSTAIN') {
    setLoading(true);
    try {
      await votingApi.vote(meetingId, voteSessionId, choice);
      toast.success('Voto registrado.');
      onVoted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al votar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Moción: {topicTitle}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          disabled={loading}
          onClick={() => submit('YES')}
        >
          Sí
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          disabled={loading}
          onClick={() => submit('NO')}
        >
          No
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={loading}
          onClick={() => submit('ABSTAIN')}
        >
          Abstención
        </Button>
      </div>
    </div>
  );
}
