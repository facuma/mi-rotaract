'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string };
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  LIVE: 'En vivo',
  PAUSED: 'Pausada',
  FINISHED: 'Finalizada',
  ARCHIVED: 'Archivada',
};

export default function ParticipantMeetingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    meetingsApi
      .get(id)
      .then((m) => setMeeting(m as Meeting))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!meeting) return null;

  const canEnterLive = meeting.status === 'LIVE' || meeting.status === 'PAUSED';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meeting.title}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{STATUS_LABEL[meeting.status] ?? meeting.status}</Badge>
          {meeting.club?.name && <span>Club: {meeting.club.name}</span>}
          {meeting.scheduledAt && (
            <span>
              Programada: {new Date(meeting.scheduledAt).toLocaleString('es-AR')}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meeting.description && (
          <p className="text-sm text-muted-foreground">{meeting.description}</p>
        )}
        {canEnterLive && (
          <Button asChild>
            <Link href={`/meetings/${id}/live`}>Entrar a la sala en vivo</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
