'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type EventsEmptyStateProps = {
  isPast?: boolean;
  canAdmin?: boolean;
};

export function EventsEmptyState({ isPast, canAdmin }: EventsEmptyStateProps) {
  return (
    <EmptyState
      title={
        isPast
          ? 'No hay eventos pasados para mostrar'
          : 'No hay eventos próximos'
      }
      description={
        !isPast ? 'Revisá los pasados o creá uno nuevo.' : undefined
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {!isPast && (
            <Button variant="outline" asChild>
              <Link href="/eventos/pasados">Ver eventos pasados</Link>
            </Button>
          )}
          {canAdmin && (
            <Button asChild>
              <Link href="/admin/eventos/nuevo">Crear evento</Link>
            </Button>
          )}
        </div>
      }
    />
  );
}
