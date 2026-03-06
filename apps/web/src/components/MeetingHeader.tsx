'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  LIVE: 'En vivo',
  PAUSED: 'Pausada',
  FINISHED: 'Finalizada',
  ARCHIVED: 'Archivada',
};

type MeetingHeaderProps = {
  title: string;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string } | null;
  actions?: React.ReactNode;
  className?: string;
};

export function MeetingHeader({
  title,
  status,
  scheduledAt,
  club,
  actions,
  className,
}: MeetingHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>
        {club?.name && <span className="text-sm text-muted-foreground">Club: {club.name}</span>}
        {scheduledAt && (
          <span className="text-sm text-muted-foreground">
            Programada: {new Date(scheduledAt).toLocaleString('es-AR')}
          </span>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </div>
  );
}
