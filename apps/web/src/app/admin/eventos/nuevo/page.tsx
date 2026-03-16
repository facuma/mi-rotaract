'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, clubsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EventForm } from '@/components/events/EventForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Club } from '@/lib/api';
import type { EventFormData } from '@/components/events/EventForm';

export default function AdminEventoNuevoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);

  useEffect(() => {
    clubsApi.list().then(setClubs).catch(() => setClubs([]));
  }, []);

  const isPresident = user?.role === 'PRESIDENT';

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
    const event = await eventsApi.create(payload);
    router.push(`/admin/eventos`);
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Nuevo evento</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/eventos">← Volver</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <EventForm
          clubs={clubs}
          isPresident={isPresident}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/eventos')}
        />
      </CardContent>
    </Card>
  );
}
