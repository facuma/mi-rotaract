'use client';

import { useEffect, useState } from 'react';
import { meetingsApi } from '@/lib/api';
import { MeetingsTable } from '@/components/MeetingsTable';
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

export default function MyMeetingsPage() {
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
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
      <CardHeader>
        <CardTitle>Mis reuniones</CardTitle>
        <CardDescription>
          {meetings.length === 0
            ? 'No tenés reuniones asignadas.'
            : `Tenés ${meetings.length} reunión${meetings.length === 1 ? '' : 'es'} asignada${meetings.length === 1 ? '' : 's'}.`}
        </CardDescription>
      </CardHeader>
      {meetings.length > 0 && (
        <CardContent>
          <MeetingsTable meetings={meetings} detailHref={(id) => `/meetings/${id}`} />
        </CardContent>
      )}
    </Card>
  );
}
