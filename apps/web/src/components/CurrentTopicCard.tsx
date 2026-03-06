'use client';

import { TimerDisplay } from '@/components/TimerDisplay';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  DISCUSSION: 'Discusión',
  VOTING: 'Votación',
  INFORMATIVE: 'Informativo',
};

type Topic = {
  title: string;
  type?: string;
  status?: string;
};

type Timer = {
  remainingSec: number;
  overtimeSec: number;
};

type CurrentTopicCardProps = {
  topic: Topic | null;
  timer?: Timer | null;
  className?: string;
};

export function CurrentTopicCard({ topic, timer, className }: CurrentTopicCardProps) {
  if (!topic && !timer) return null;

  return (
    <Card className={cn('border-primary/30 bg-primary/5', className)}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tema actual
            </p>
            <p className="text-lg font-medium">
              {topic?.title ?? '—'}
            </p>
            {topic && (
              <div className="mt-1 flex items-center gap-2">
                {topic.type && (
                  <Badge variant="outline">{TYPE_LABELS[topic.type] ?? topic.type}</Badge>
                )}
                {topic.status && (
                  <Badge variant="secondary">{topic.status}</Badge>
                )}
              </div>
            )}
          </div>
          {timer && (
            <TimerDisplay
              remainingSec={timer.remainingSec}
              overtimeSec={timer.overtimeSec}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
