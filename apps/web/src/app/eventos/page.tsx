'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useClubsListQuery, useEventsListQuery, useEventsUpcomingQuery, splitFeaturedEvents } from '@/lib/queries';
import { useAuth } from '@/context/AuthContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EventCard } from '@/components/events/EventCard';
import { EventHeroCard } from '@/components/events/EventHeroCard';
import { EventFilters, type EventFiltersState } from '@/components/events/EventFilters';
import { EventsEmptyState } from '@/components/events/EventsEmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event, Club } from '@/lib/api';

export default function EventosPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<EventFiltersState>({});

  const canAdmin = user?.role === 'SECRETARY' || user?.role === 'PRESIDENT';

  const eventsParams = useMemo(
    () => ({
      upcoming: true as const,
      page: 1,
      limit: 20,
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
      ...(filters.type && { type: filters.type }),
      ...(filters.modality && { modality: filters.modality }),
      ...(filters.clubId && { clubId: filters.clubId }),
    }),
    [filters.from, filters.to, filters.type, filters.modality, filters.clubId],
  );

  const upcomingQuery = useEventsUpcomingQuery(3);
  const listQuery = useEventsListQuery(eventsParams);
  const clubsQuery = useClubsListQuery(false, canAdmin);

  const upcoming = (upcomingQuery.data ?? []) as Event[];
  const events = (listQuery.data?.data ?? []) as Event[];
  const clubs = (clubsQuery.data ?? []) as Club[];
  const loading = upcomingQuery.isLoading || listQuery.isLoading || (canAdmin && clubsQuery.isLoading);
  const { featured, others } = useMemo(() => splitFeaturedEvents(upcoming, events), [upcoming, events]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Eventos"
        action={
          canAdmin && (
            <Button asChild>
              <Link href="/admin/eventos/nuevo">Crear evento</Link>
            </Button>
          )
        }
      />
      <EventFilters filters={filters} onFiltersChange={setFilters} clubs={clubs} />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Destacados</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((e) => (
                  <EventHeroCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              {featured.length > 0 ? 'Próximos eventos' : 'Eventos próximos'}
            </h2>
            {others.length === 0 && featured.length === 0 ? (
              <EventsEmptyState canAdmin={canAdmin} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
                <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                  <Button variant="outline" asChild>
                    <Link href="/eventos/pasados">Ver eventos pasados</Link>
                  </Button>
                  {canAdmin && (
                    <Button asChild>
                      <Link href="/admin/eventos/nuevo">Crear evento</Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
