'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { votingApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VoteCandidate } from '@/hooks/useMeetingRoom';

type VoteChoice = 'YES' | 'NO' | 'ABSTAIN';

const VOTE_OPTIONS: { choice: VoteChoice; label: string; colors: string; activeRing: string; icon: string }[] = [
  { choice: 'YES', label: 'A favor', colors: 'bg-success/10 border-success/30 hover:bg-success/20 text-success', activeRing: 'ring-2 ring-success', icon: '✓' },
  { choice: 'NO', label: 'En contra', colors: 'bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive', activeRing: 'ring-2 ring-destructive', icon: '✗' },
  { choice: 'ABSTAIN', label: 'Abstención', colors: 'bg-muted border-border hover:bg-muted/80 text-muted-foreground', activeRing: 'ring-2 ring-border', icon: '—' },
];

export function VoteActionPanel({
  meetingId,
  voteSessionId,
  topicTitle,
  ballotType = 'YES_NO',
  candidates = [],
  onVoted,
}: {
  meetingId: string;
  voteSessionId: string;
  topicTitle: string;
  ballotType?: 'YES_NO' | 'CANDIDATE';
  candidates?: VoteCandidate[];
  onVoted?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState<{ choice: VoteChoice; candidateId?: string } | null>(null);

  async function submitChoice(choice: VoteChoice, candidateId?: string) {
    setLoading(true);
    try {
      await votingApi.vote(meetingId, voteSessionId, choice, candidateId);
      setVoted({ choice, candidateId });
      toast.success('Voto registrado.');
      onVoted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al votar.');
    } finally {
      setLoading(false);
    }
  }

  if (ballotType === 'CANDIDATE') {
    const votedCandidate = candidates.find((c) => c.id === voted?.candidateId);
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Elección: {topicTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {voted ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tu voto fue registrado.</p>
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                Candidato seleccionado: {votedCandidate?.displayName ?? voted.candidateId}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Seleccioná un candidato para emitir tu voto:</p>
              {candidates.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={loading}
                  onClick={() => submitChoice('YES', c.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-all active:scale-[0.98] text-left',
                    'bg-muted/30 border-border hover:bg-primary/10 hover:border-primary/40 cursor-pointer disabled:cursor-wait disabled:opacity-60',
                  )}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{c.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Moción: {topicTitle}</CardTitle>
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
                  aria-pressed={voted.choice === opt.choice}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
                    voted.choice === opt.choice
                      ? cn(opt.colors, opt.activeRing)
                      : 'opacity-30 border-border bg-muted/20 text-muted-foreground',
                  )}
                >
                  <span className="text-2xl">{opt.icon}</span>
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
                onClick={() => submitChoice(opt.choice)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95',
                  'cursor-pointer disabled:cursor-wait disabled:opacity-60',
                  opt.colors,
                )}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
