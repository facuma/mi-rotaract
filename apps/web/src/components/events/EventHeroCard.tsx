'use client';

import { EventCard } from './EventCard';
import type { Event } from '@/lib/api';

type EventHeroCardProps = {
  event: Event;
};

export function EventHeroCard({ event }: EventHeroCardProps) {
  return <EventCard event={event} variant="hero" />;
}
