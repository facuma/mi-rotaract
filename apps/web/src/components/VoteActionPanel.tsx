'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { votingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type VoteChoice = 'YES' | 'NO' | 'ABSTAIN';

const VOTE_OPTIONS: { choice: VoteChoice; label: string; colors: string; activeRing: string }[] = [
  {
    choice: 'YES',
    label: 'A favor',
    colors: 'bg-success/10 border-success/30 hover:bg-success/20 text-success',
    activeRing: 'ring-2 ring-success',
  },
  {
    choice: 'NO',
    label: 'En contra',
    colors: 'bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive',
    activeRing: 'ring-2 ring-destructive',
  },
  {
    choice: 'ABSTAIN',
    label: 'Abstención',
    colors: 'bg-muted border-border hover:bg-muted/80 text-muted-foreground',
    activeRing: 'ring-2 ring-border',
  },
];

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
  const [voted, setVoted] = useState<VoteChoice | null>(null);

  async function submit(choice: VoteChoice) {
    setLoading(true);
    try {
      await votingApi.vote(meetingId, voteSessionId, choice);
      setVoted(choice);
      toast.success('Voto registrado.');
      onVoted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al votar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Moción: {topicTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {voted ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tu voto fue registrado.</p>
            <div className="grid grid-cols-3 gap-3">
              {VOTE_OPTIONS.map((opt) => (
                <button
                  key={opt.choice}
                  disabled
                  aria-pressed={voted === opt.choice}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
                    voted === opt.choice
                      ? cn(opt.colors, opt.activeRing)
                      : 'opacity-30 border-border bg-muted/20 text-muted-foreground',
                  )}
                >
                  <span className="text-2xl">
                    {opt.choice === 'YES' ? '✓' : opt.choice === 'NO' ? '✗' : '—'}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {VOTE_OPTIONS.map((opt) => (
              <button
                key={opt.choice}
                type="button"
                disabled={loading}
                aria-pressed={false}
                onClick={() => submit(opt.choice)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95',
                  'cursor-pointer disabled:cursor-wait disabled:opacity-60',
                  opt.colors,
                )}
              >
                <span className="text-2xl">
                  {opt.choice === 'YES' ? '✓' : opt.choice === 'NO' ? '✗' : '—'}
                </span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
