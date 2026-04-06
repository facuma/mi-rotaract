'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { clubsApi, eventsApi, meetingsApi, topicsApi, talentPublicApi, type Event, type EventsListParams } from '@/lib/api';

export const queryKeys = {
  meetings: ['meetings'] as const,
  meetingDetail: (id: string) => ['meetings', id] as const,
  meetingTopics: (id: string) => ['meetings', id, 'topics'] as const,
  eventsUpcoming: (limit: number) => ['events', 'upcoming', limit] as const,
  eventsList: (params: EventsListParams) => ['events', 'list', params] as const,
  clubsList: (includeInactive = false) => ['clubs', includeInactive] as const,
  talentPublic: (params: { q?: string; page: number; limit: number }) => ['talent', 'public', params] as const,
};

export function useMeetingsQuery() {
  return useQuery({
    queryKey: queryKeys.meetings,
    queryFn: () => meetingsApi.list(),
  });
}

export function useMeetingDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.meetingDetail(id),
    queryFn: () => meetingsApi.get(id),
    enabled: !!id,
  });
}

export function useMeetingTopicsQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.meetingTopics(id),
    queryFn: () => topicsApi.list(id),
    enabled: !!id,
  });
}

export function useEventsUpcomingQuery(limit = 3) {
  return useQuery({
    queryKey: queryKeys.eventsUpcoming(limit),
    queryFn: () => eventsApi.upcoming(limit),
  });
}

export function useEventsListQuery(params: EventsListParams) {
  return useQuery({
    queryKey: queryKeys.eventsList(params),
    queryFn: () => eventsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useClubsListQuery(includeInactive = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clubsList(includeInactive),
    queryFn: () => clubsApi.list(includeInactive),
    enabled,
  });
}

export function usePublicTalentQuery(params: { q?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.talentPublic(params),
    queryFn: () => talentPublicApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function splitFeaturedEvents(upcoming: Event[], events: Event[]) {
  const heroIds = new Set(upcoming.map((event) => event.id));
  const featured = upcoming.filter((event) => event.featured);
  const others = events.filter((event) => !heroIds.has(event.id));

  return { featured, others };
}
