'use client';

import Link from 'next/link';
import { useMeetingsQuery } from '@/lib/queries';
import { MeetingsTable } from '@/components/MeetingsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/empty-state';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string };
};

export default function MyMeetingsPage() {
  const { data, isLoading, error } = useMeetingsQuery();
  const meetings = (data ?? []) as Meeting[];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : 'No se pudo cargar reuniones.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mis reuniones"
        description={
          meetings.length > 0
            ? `Tenés ${meetings.length} reunión${meetings.length === 1 ? '' : 'es'} asignada${meetings.length === 1 ? '' : 's'}.`
            : undefined
        }
      />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No tenés reuniones asignadas"
                description="Cuando te asignen una reunión, aparecerá aquí."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/history">Ver historial</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <MeetingsTable
                meetings={meetings}
                detailHref={(id) => `/meetings/${id}`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
