'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  return new Date(d).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeRange(startsAt: string, endsAt?: string | null) {
  const start = new Date(startsAt);
  const startStr = start.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!endsAt) return startStr;
  const end = new Date(endsAt);
  const endStr = end.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${startStr} - ${endStr}`;
}

type EventDetailProps = {
  event: Event;
  canEdit?: boolean;
};

export function EventDetail({ event, canEdit }: EventDetailProps) {
  const isCancelled = event.status === 'CANCELLED';

  return (
    <Card className={isCancelled ? 'opacity-90' : ''}>
      {event.imageUrl && (
        <div
          className="h-48 rounded-t-lg bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${event.imageUrl})` }}
        />
      )}
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {event.featured && (
            <Badge variant="secondary">Destacado</Badge>
          )}
          {event.status !== 'PUBLISHED' && (
            <Badge variant={event.status === 'CANCELLED' ? 'destructive' : 'outline'}>
              {STATUS_LABEL[event.status] ?? event.status}
            </Badge>
          )}
          <Badge variant="outline">{EVENT_TYPE_LABEL[event.type] ?? event.type}</Badge>
          <Badge variant="outline">{MODALITY_LABEL[event.modality] ?? event.modality}</Badge>
        </div>
        <h1 className={`text-xl font-semibold ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
          {event.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {formatDate(event.startsAt)}
          {event.endsAt && (
            <span className="ml-1">
              · {formatTimeRange(event.startsAt, event.endsAt)}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.description && (
          <div>
            <h3 className="text-sm font-medium">Descripción</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.description}
            </p>
          </div>
        )}

        {(event.location || event.meetingUrl) && (
          <div>
            <h3 className="text-sm font-medium">Ubicación / Enlace</h3>
            {event.location && (
              <p className="mt-1 text-sm text-muted-foreground">{event.location}</p>
            )}
            {event.meetingUrl && (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-primary hover:underline"
              >
                {event.meetingUrl}
              </a>
            )}
          </div>
        )}

        {event.club && (
          <div>
            <h3 className="text-sm font-medium">Club</h3>
            <p className="mt-1 text-sm text-muted-foreground">{event.club.name}</p>
          </div>
        )}

        {event.organizer && (
          <div>
            <h3 className="text-sm font-medium">Organizador</h3>
            <p className="mt-1 text-sm text-muted-foreground">{event.organizer.fullName}</p>
          </div>
        )}

        {event.maxCapacity != null && (
          <div>
            <h3 className="text-sm font-medium">Cupo</h3>
            <p className="mt-1 text-sm text-muted-foreground">{event.maxCapacity} personas</p>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" asChild>
              <Link href={`/admin/eventos/${event.id}/editar`}>Editar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/eventos">← Volver al listado</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
