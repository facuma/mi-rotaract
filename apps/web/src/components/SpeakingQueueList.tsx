'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type QueueItem = {
  id: string;
  userId: string;
  fullName: string;
  position: number;
  status?: string;
};

type SpeakingQueueListProps = {
  items: QueueItem[];
  /** Si es admin, mostrar opciones para reordenar/aceptar (por ahora solo lectura) */
  isAdmin?: boolean;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
};

export function SpeakingQueueList({
  items,
  isAdmin,
  className,
}: SpeakingQueueListProps) {
  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">Cola de oradores</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cola.</p>
        ) : (
          <ol className="space-y-2">
            {sorted.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {item.position}. {item.fullName}
                </span>
                {item.status && (
                  <Badge variant="outline" className="text-xs">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
