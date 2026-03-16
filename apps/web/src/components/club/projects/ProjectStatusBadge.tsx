'use client';

import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  IDEA: 'Idea',
  PLANIFICACION: 'Planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
