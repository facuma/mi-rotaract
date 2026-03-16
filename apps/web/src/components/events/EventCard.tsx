'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Event, EventType, EventModality } from '@/lib/api';

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  DISTRITAL: 'Distrital',
  CLUB: 'Club',
  CAPACITACION: 'Capacitación',
  REUNION: 'Reunión',
  ASAMBLEA: 'Asamblea',
  PROYECTO_SERVICIO: 'Proyecto de servicio',
  NETWORKING: 'Networking',
  PROFESIONAL: 'Profesional',
};

const MODALITY_LABEL: Record<EventModality, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDA: 'Híbrida',
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publicado',
  CANCELLED: 'Cancelado',
  FINISHED: 'Finalizado',
};

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type EventCardProps = {
  event: Event;
  variant?: 'default' | 'hero';
};

export function EventCard({ event, variant = 'default' }: EventCardProps) {
  const isCancelled = event.status === 'CANCELLED';

  return (
    <Link href={`/eventos/${event.id}`}>
      <Card
        className={`transition-colors hover:border-primary/50 ${
          variant === 'hero'
            ? 'border-primary/30 bg-primary/5'
            : isCancelled
              ? 'opacity-75'
              : ''
        }`}
      >
        {event.imageUrl && variant === 'hero' && (
          <div
            className="h-32 rounded-t-lg bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${event.imageUrl})` }}
          />
        )}
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {event.featured && (
              <Badge variant="secondary" className="text-xs">
                Destacado
              </Badge>
            )}
            {event.status !== 'PUBLISHED' && (
              <Badge variant={event.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                {STATUS_LABEL[event.status] ?? event.status}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {EVENT_TYPE_LABEL[event.type] ?? event.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {MODALITY_LABEL[event.modality] ?? event.modality}
            </Badge>
          </div>
          <h3
            className={`font-semibold ${isCancelled ? 'line-through text-muted-foreground' : ''}`}
          >
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</p>
        </CardHeader>
        <CardContent className="pt-0">
          {event.club && (
            <p className="text-xs text-muted-foreground">Club: {event.club.name}</p>
          )}
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
