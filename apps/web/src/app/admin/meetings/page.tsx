'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { meetingsApi } from '@/lib/api';
import { MeetingsTable } from '@/components/MeetingsTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string };
};

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    meetingsApi
      .list()
      .then((m) => setMeetings(m as Meeting[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Reuniones</CardTitle>
          <CardDescription>
            Gestioná las reuniones distritales y su agenda.
          </CardDescription>
        </div>
        <Button asChild>
          <Link href="/admin/meetings/new">Nueva reunión</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <MeetingsTable meetings={meetings} />
      </CardContent>
    </Card>
  );
}
