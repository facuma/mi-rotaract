'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EventDetail } from '@/components/events/EventDetail';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@/lib/api';

export default function EventoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    eventsApi
      .get(id)
      .then(setEvent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const canEdit =
    user &&
    (user.role === 'SECRETARY' ||
      ((user.role === 'PRESIDENT' || user.role === 'RDR') && event?.clubId));

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          {error || 'Evento no encontrado.'}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/eventos">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/eventos">← Eventos</Link>
      </Button>
      <EventDetail event={event} canEdit={!!canEdit} />
    </div>
  );
}
