'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, clubsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EventForm } from '@/components/events/EventForm';
import { AttachmentsCard } from '@/components/attachments/AttachmentsCard';
import { ATTACHMENT_CONFIG } from '@/lib/attachment-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event, Club } from '@/lib/api';
import type { EventFormData } from '@/components/events/EventForm';

export default function AdminEventoEditarPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([eventsApi.get(id), clubsApi.list()])
      .then(([ev, cls]) => {
        setEvent(ev);
        setClubs(cls as Club[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isPresident = user?.role === 'PRESIDENT' || user?.role === 'RDR';

  const handleSubmit = async (data: EventFormData) => {
    const payload = {
      title: data.title,
      description: data.description,
      type: data.type,
      modality: data.modality,
      startsAt: data.startsAt.includes('T') ? data.startsAt : `${data.startsAt}T00:00:00`,
      endsAt: data.endsAt
        ? data.endsAt.includes('T')
          ? data.endsAt
          : `${data.endsAt}T00:00:00`
        : undefined,
      location: data.location,
      meetingUrl: data.meetingUrl,
      maxCapacity: data.maxCapacity,
      featured: data.featured,
      imageUrl: data.imageUrl,
      clubId: data.clubId,
    };
    await eventsApi.update(id, payload);
    router.push(`/admin/eventos`);
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !event) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-destructive">
            {error || 'Evento no encontrado.'}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/eventos">Volver</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Editar evento</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/eventos">← Volver</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <EventForm
          event={event}
          clubs={clubs}
          isPresident={isPresident}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/eventos')}
        />
        {event.status === 'DRAFT' && (
          <AttachmentsCard
            fetchKey={id}
            title="Adjuntos / Evidencias"
            list={() => eventsApi.listAttachments(id)}
            upload={(file) => eventsApi.uploadAttachment(id, file)}
            deleteAttachment={(attachmentId) =>
              eventsApi.deleteAttachment(id, attachmentId)
            }
            maxFiles={ATTACHMENT_CONFIG.event.maxFiles}
            maxSizeBytes={ATTACHMENT_CONFIG.event.maxSizeMB * 1024 * 1024}
            accept={ATTACHMENT_CONFIG.event.accept}
          />
        )}
      </CardContent>
    </Card>
  );
}
