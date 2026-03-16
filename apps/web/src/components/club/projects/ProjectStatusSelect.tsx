'use client';

import { Button } from '@/components/ui/button';

const LABELS: Record<string, string> = {
  PLANIFICACION: 'Planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelar',
};

export function ProjectStatusSelect({
  current,
  options,
  onChange,
}: {
  current: string;
  options: string[];
  onChange: (status: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-muted-foreground mr-1">Cambiar estado:</span>
      {options.map((opt) => (
        <Button
          key={opt}
          variant="outline"
          size="sm"
          onClick={() => onChange(opt)}
        >
          {LABELS[opt] ?? opt}
        </Button>
      ))}
    </div>
  );
}
