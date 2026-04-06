'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type VoteResultSummaryProps = {
  yes: number;
  no: number;
  abstain: number;
  total: number;
  className?: string;
};

export function VoteResultSummary({
  yes,
  no,
  abstain,
  total,
  className,
}: VoteResultSummaryProps) {
  const voted = yes + no + abstain;
  const pctYes = voted > 0 ? Math.round((yes / voted) * 100) : 0;
  const pctNo = voted > 0 ? Math.round((no / voted) * 100) : 0;
  const pctAbstain = voted > 0 ? Math.round((abstain / voted) * 100) : 0;
  const approved = yes > no;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Resultado</p>
        {voted > 0 && (
          <Badge variant={approved ? 'success' : 'destructive'}>
            {approved ? 'Aprobada' : 'Rechazada'}
          </Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-success">{yes}</p>
          <p className="text-xs text-muted-foreground">A favor ({pctYes}%)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-destructive">{no}</p>
          <p className="text-xs text-muted-foreground">En contra ({pctNo}%)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-muted-foreground">{abstain}</p>
          <p className="text-xs text-muted-foreground">Abstención ({pctAbstain}%)</p>
        </div>
      </div>

      {/* Progress bar */}
      {voted > 0 && (
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {pctYes > 0 && (
            <div
              className="bg-success transition-all duration-500"
              style={{ width: `${pctYes}%` }}
            />
          )}
          {pctNo > 0 && (
            <div
              className="bg-destructive transition-all duration-500"
              style={{ width: `${pctNo}%` }}
            />
          )}
          {pctAbstain > 0 && (
            <div
              className="bg-muted-foreground/30 transition-all duration-500"
              style={{ width: `${pctAbstain}%` }}
            />
          )}
        </div>
      )}

      {/* Total */}
      <p className="text-xs text-muted-foreground text-center">
        {voted} de {total} votaron ({total > 0 ? Math.round((voted / total) * 100) : 0}%)
      </p>
    </div>
  );
}
