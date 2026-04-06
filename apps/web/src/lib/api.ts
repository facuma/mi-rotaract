const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authApi = {
  updateMe: (fullName: string, email: string) =>
    api<{ user: { id: string; fullName: string; email: string; role: string } }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ fullName, email }),
    }),
  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ message: string }>('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    }),
};

export type DashboardWidget = {
  id: string;
  type: 'list' | 'cards' | 'shortcuts' | 'alerts' | 'indicators';
  title: string;
  data: unknown;
  emptyMessage?: string;
};

export type DashboardResponse = {
  role: string;
  widgets: DashboardWidget[];
};

export const dashboardApi = {
  get: () => api<DashboardResponse>('/dashboard'),
};

export function getAttachmentDownloadUrl(attachmentId: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
  const url = `${API_URL}/attachments/${attachmentId}/download`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function getAttachmentDownloadHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mi_rotaract_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText || 'Error');
  }
  return res.json();
}

export const meetingsApi = {
  list: () => api<unknown[]>('/meetings'),
  downloadBulkTemplate: () => downloadTemplate('/meetings/bulk/template', 'plantilla-reuniones.csv'),
  bulkImport: (file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi('/meetings/bulk', file, mode),
  downloadParticipantsBulkTemplate: (meetingId: string) =>
    downloadTemplate(`/meetings/${meetingId}/participants/bulk/template`, 'plantilla-participantes-reunion.csv'),
  bulkImportParticipants: (meetingId: string, file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi(`/meetings/${meetingId}/participants/bulk`, file, mode),
  get: (id: string) => api<unknown>(`/meetings/${id}`),
  create: (body: { title: string; description?: string; scheduledAt?: string; clubId: string; type?: string; isDistrictMeeting?: boolean }) =>
    api<unknown>('/meetings', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { title?: string; description?: string; scheduledAt?: string }) =>
    api<unknown>(`/meetings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  start: (id: string) => api<unknown>(`/meetings/${id}/start`, { method: 'POST' }),
  pause: (id: string) => api<unknown>(`/meetings/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => api<unknown>(`/meetings/${id}/resume`, { method: 'POST' }),
  finish: (id: string) => api<unknown>(`/meetings/${id}/finish`, { method: 'POST' }),
  schedule: (id: string) => api<unknown>(`/meetings/${id}/schedule`, { method: 'POST' }),
  assignParticipants: (id: string, participants: { userId: string; canVote?: boolean }[]) =>
    api<unknown>(`/meetings/${id}/participants`, {
      method: 'POST',
      body: JSON.stringify({ participants }),
    }),
  listAttachments: (id: string) =>
    api<{ id: string; fileName: string; sizeBytes?: number }[]>(`/meetings/${id}/attachments`),
  uploadAttachment: async (id: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meetings/${id}/attachments`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    return res.json();
  },
  deleteAttachment: (meetingId: string, attachmentId: string) =>
    api<unknown>(`/meetings/${meetingId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};

export const queueApi = {
  request: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/queue/request`, { method: 'POST' }),
  cancel: (meetingId: string, requestId: string) =>
    api<unknown>(`/meetings/${meetingId}/queue/cancel`, { method: 'POST', body: JSON.stringify({ requestId }) }),
  list: (meetingId: string) => api<unknown[]>(`/meetings/${meetingId}/queue`),
  state: (meetingId: string) => api<{ queue: unknown[]; currentSpeaker: unknown; nextSpeaker: unknown }>(`/meetings/${meetingId}/queue/state`),
  setCurrentSpeaker: (meetingId: string, userId: string | null) =>
    api<unknown>(`/meetings/${meetingId}/queue/current-speaker`, { method: 'POST', body: JSON.stringify({ userId }) }),
  setNextSpeaker: (meetingId: string, userId: string | null) =>
    api<unknown>(`/meetings/${meetingId}/queue/next-speaker`, { method: 'POST', body: JSON.stringify({ userId }) }),
};

export const votingApi = {
  open: (meetingId: string, topicId: string, options?: { votingMethod?: string; requiredMajority?: string; isElection?: boolean }) =>
    api<unknown>(`/meetings/${meetingId}/vote/open`, { method: 'POST', body: JSON.stringify({ topicId, ...options }) }),
  close: (meetingId: string, voteSessionId: string) =>
    api<unknown>(`/meetings/${meetingId}/vote/close`, { method: 'POST', body: JSON.stringify({ voteSessionId }) }),
  vote: (meetingId: string, voteSessionId: string, choice: 'YES' | 'NO' | 'ABSTAIN') =>
    api<unknown>(`/meetings/${meetingId}/vote`, { method: 'POST', body: JSON.stringify({ voteSessionId, choice }) }),
  rdrTiebreaker: (meetingId: string, voteSessionId: string, choice: 'YES' | 'NO' | 'ABSTAIN') =>
    api<unknown>(`/meetings/${meetingId}/vote/rdr-tiebreaker`, { method: 'POST', body: JSON.stringify({ voteSessionId, choice }) }),
  current: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/vote/current`),
  result: (meetingId: string, voteSessionId: string) =>
    api<unknown>(`/meetings/${meetingId}/vote/${voteSessionId}/result`),
};

export const cartaPoderApi = {
  create: (meetingId: string, body: { clubId: string; delegateUserId: string; documentUrl?: string }) =>
    api<unknown>(`/meetings/${meetingId}/carta-poder`, { method: 'POST', body: JSON.stringify(body) }),
  list: (meetingId: string) =>
    api<unknown[]>(`/meetings/${meetingId}/carta-poder`),
  verify: (meetingId: string, cpId: string) =>
    api<unknown>(`/meetings/${meetingId}/carta-poder/${cpId}/verify`, { method: 'PATCH' }),
  remove: (meetingId: string, cpId: string) =>
    api<unknown>(`/meetings/${meetingId}/carta-poder/${cpId}`, { method: 'DELETE' }),
};

export const topicsApi = {
  list: (meetingId: string) => api<unknown[]>(`/meetings/${meetingId}/topics`),
  create: (meetingId: string, body: { title: string; description?: string; order?: number; type?: string; estimatedDurationSec?: number }) =>
    api<unknown>(`/meetings/${meetingId}/topics`, { method: 'POST', body: JSON.stringify(body) }),
  update: (meetingId: string, topicId: string, body: { title?: string; description?: string; order?: number; type?: string; estimatedDurationSec?: number }) =>
    api<unknown>(`/meetings/${meetingId}/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (meetingId: string, topicId: string) =>
    api<unknown>(`/meetings/${meetingId}/topics/${topicId}`, { method: 'DELETE' }),
  reorder: (meetingId: string, topicIds: string[]) =>
    api<unknown[]>(`/meetings/${meetingId}/topics/reorder`, { method: 'POST', body: JSON.stringify({ topicIds }) }),
  setCurrent: (meetingId: string, topicId: string | null) =>
    api<unknown>(`/meetings/${meetingId}/topics/current`, { method: 'POST', body: JSON.stringify({ topicId }) }),
};

export type Club = {
  id: string;
  name: string;
  code: string;
  status: string;
  presidentEmail?: string | null;
  enabledForDistrictMeetings: boolean;
  cuotaAldia: boolean;
  informeAlDia: boolean;
};

export type BulkImportResult = {
  total: number;
  created: number;
  failed: number;
  mode: 'partial' | 'strict';
  createdIds?: string[];
  errors: { row: number; data: Record<string, unknown>; message: string }[];
  reportCsv?: string;
};

async function bulkImportApi(
  path: string,
  file: File,
  mode?: 'partial' | 'strict',
): Promise<BulkImportResult> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const q = mode ? `?mode=${mode}` : '';
  const res = await fetch(`${API_URL}${path}${q}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

async function downloadTemplate(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Error al descargar plantilla');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const clubsApi = {
  list: (includeInactive?: boolean) =>
    api<Club[]>(`/clubs${includeInactive ? '?includeInactive=true' : ''}`),
  get: (id: string) => api<Club>(`/clubs/${id}`),
  downloadBulkTemplate: () => downloadTemplate('/clubs/bulk/template', 'plantilla-clubes.csv'),
  bulkImport: (file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi('/clubs/bulk', file, mode),
  create: (body: {
    name: string;
    code: string;
    presidentEmail?: string;
    enabledForDistrictMeetings?: boolean;
    cuotaAldia?: boolean;
    informeAlDia?: boolean;
  }) => api<Club>('/clubs', { method: 'POST', body: JSON.stringify(body) }),
  update: (
    id: string,
    body: {
      name?: string;
      code?: string;
      presidentEmail?: string;
      enabledForDistrictMeetings?: boolean;
      cuotaAldia?: boolean;
      informeAlDia?: boolean;
    },
  ) => api<Club>(`/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    api<unknown>(`/clubs/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: () =>
    api<{ id: string; fullName: string; email: string; role: string }[]>('/users'),
  downloadBulkTemplate: () => downloadTemplate('/users/bulk/template', 'plantilla-usuarios.csv'),
  bulkImport: (file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi('/users/bulk', file, mode),
};

export type ActiveTimer = {
  id: string;
  type: string;
  topicId: string;
  plannedDurationSec: number;
  startedAt: string;
  remainingSec: number;
  overtimeSec: number;
};

export const timersApi = {
  startTopic: (meetingId: string, topicId: string, durationSec: number) =>
    api<ActiveTimer>(`/meetings/${meetingId}/timers/topic/start`, {
      method: 'POST',
      body: JSON.stringify({ topicId, durationSec }),
    }),
  stop: (meetingId: string, timerId: string) =>
    api<unknown>(`/meetings/${meetingId}/timers/stop`, {
      method: 'POST',
      body: JSON.stringify({ timerId }),
    }),
  getActive: (meetingId: string) => api<ActiveTimer | null>(`/meetings/${meetingId}/timers/active`),
};

export const districtApi = {
  periods: {
    list: () => api<{ id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }[]>('/district/periods'),
    get: (id: string) => api<unknown>(`/district/periods/${id}`),
    getCurrent: () => api<unknown | null>('/district/periods/current'),
    create: (body: { name: string; startDate: string; endDate: string; isCurrent?: boolean }) =>
      api<unknown>('/district/periods', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; startDate?: string; endDate?: string; isCurrent?: boolean }) =>
      api<unknown>(`/district/periods/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => api<unknown>(`/district/periods/${id}`, { method: 'DELETE' }),
  },
  reports: {
    list: (params?: { periodId?: string; clubId?: string; status?: string; type?: string; page?: number; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.periodId) search.set('periodId', params.periodId);
      if (params?.clubId) search.set('clubId', params.clubId);
      if (params?.status) search.set('status', params.status);
      if (params?.type) search.set('type', params.type);
      if (params?.page) search.set('page', String(params.page));
      if (params?.limit) search.set('limit', String(params.limit));
      const q = search.toString();
      return api<{ items: unknown[]; total: number; page: number; limit: number }>(`/district/reports${q ? `?${q}` : ''}`);
    },
    getMissing: (periodId: string, type?: string) =>
      api<{ periodId: string; periodName: string; missing: { clubId: string; clubName: string; clubCode: string; type: string }[] }>(
        `/district/reports/missing?periodId=${encodeURIComponent(periodId)}${type ? `&type=${encodeURIComponent(type)}` : ''}`,
      ),
    getSummary: (periodId: string, type?: string) =>
      api<{
        periodId: string; periodName: string; activeClubsCount: number;
        reportsSubmitted: number; reportsApproved: number; reportsObserved: number;
        pctClubesAlDia: number; byStatus: Record<string, number>;
      }>(`/district/reports/summary?periodId=${encodeURIComponent(periodId)}${type ? `&type=${encodeURIComponent(type)}` : ''}`),
    get: (id: string) => api<unknown>(`/district/reports/${id}`),
    update: (id: string, body: { observations?: string; status?: string }) =>
      api<unknown>(`/district/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  clubs: {
    list: (params?: { status?: string; search?: string; informeAlDia?: boolean; enabledForDistrictMeetings?: boolean }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.search) search.set('search', params.search);
      if (params?.informeAlDia !== undefined) search.set('informeAlDia', String(params.informeAlDia));
      if (params?.enabledForDistrictMeetings !== undefined) search.set('enabledForDistrictMeetings', String(params.enabledForDistrictMeetings));
      const q = search.toString();
      return api<unknown[]>(`/district/clubs${q ? `?${q}` : ''}`);
    },
    get: (id: string) => api<unknown>(`/district/clubs/${id}`),
    getReports: (id: string, periodId?: string) =>
      api<{ items: unknown[] }>(`/district/clubs/${id}/reports${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}`),
    update: (id: string, body: { name?: string; code?: string; presidentEmail?: string; enabledForDistrictMeetings?: boolean; cuotaAldia?: boolean; informeAlDia?: boolean; status?: string }) =>
      api<unknown>(`/district/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  committees: {
    list: (params?: { status?: string; coordinatorId?: string }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.coordinatorId) search.set('coordinatorId', params.coordinatorId);
      const q = search.toString();
      return api<unknown[]>(`/district/committees${q ? `?${q}` : ''}`);
    },
    get: (id: string) => api<unknown>(`/district/committees/${id}`),
    create: (body: { name: string; description?: string; coordinatorId: string; status?: string; districtPeriodId?: string }) =>
      api<unknown>('/district/committees', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; description?: string; coordinatorId?: string; status?: string; districtPeriodId?: string }) =>
      api<unknown>(`/district/committees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => api<unknown>(`/district/committees/${id}`, { method: 'DELETE' }),
    addMember: (id: string, body: { userId: string; role?: string }) =>
      api<unknown>(`/district/committees/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
    downloadMembersBulkTemplate: (id: string) =>
      downloadTemplate(`/district/committees/${id}/members/bulk/template`, 'plantilla-integrantes-comite.csv'),
    bulkImportMembers: (id: string, file: File, mode?: 'partial' | 'strict') =>
      bulkImportApi(`/district/committees/${id}/members/bulk`, file, mode),
    removeMember: (id: string, userId: string) =>
      api<unknown>(`/district/committees/${id}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
    createObjective: (id: string, body: { title: string; description?: string; order?: number }) =>
      api<unknown>(`/district/committees/${id}/objectives`, { method: 'POST', body: JSON.stringify(body) }),
    updateObjective: (id: string, objectiveId: string, body: { title?: string; description?: string; order?: number }) =>
      api<unknown>(`/district/committees/${id}/objectives/${objectiveId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteObjective: (id: string, objectiveId: string) =>
      api<unknown>(`/district/committees/${id}/objectives/${objectiveId}`, { method: 'DELETE' }),
    createActivity: (id: string, body: { title: string; date: string; notes?: string }) =>
      api<unknown>(`/district/committees/${id}/activities`, { method: 'POST', body: JSON.stringify(body) }),
    updateActivity: (id: string, activityId: string, body: { title?: string; date?: string; notes?: string }) =>
      api<unknown>(`/district/committees/${id}/activities/${activityId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteActivity: (id: string, activityId: string) =>
      api<unknown>(`/district/committees/${id}/activities/${activityId}`, { method: 'DELETE' }),
    listActivityAttachments: (committeeId: string, activityId: string) =>
      api<{ id: string; fileName: string; sizeBytes?: number }[]>(
        `/district/committees/${committeeId}/activities/${activityId}/attachments`,
      ),
    uploadActivityAttachment: async (committeeId: string, activityId: string, file: File) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/district/committees/${committeeId}/activities/${activityId}/attachments`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      return res.json();
    },
    deleteActivityAttachment: (
      committeeId: string,
      activityId: string,
      attachmentId: string,
    ) =>
      api<unknown>(
        `/district/committees/${committeeId}/activities/${activityId}/attachments/${attachmentId}`,
        { method: 'DELETE' },
      ),
  },
};

export type EventType =
  | 'DISTRITAL'
  | 'CLUB'
  | 'CAPACITACION'
  | 'REUNION'
  | 'ASAMBLEA'
  | 'PROYECTO_SERVICIO'
  | 'NETWORKING'
  | 'PROFESIONAL';
export type EventModality = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';

export type Event = {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  modality: EventModality;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  maxCapacity?: number | null;
  status: EventStatus;
  featured: boolean;
  imageUrl?: string | null;
  clubId?: string | null;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  club?: { id: string; name: string; code: string } | null;
  organizer?: { id: string; fullName: string; email: string } | null;
};

export type EventsListParams = {
  status?: EventStatus;
  from?: string;
  to?: string;
  type?: EventType;
  modality?: EventModality;
  clubId?: string;
  organizerId?: string;
  featured?: boolean;
  upcoming?: boolean;
  past?: boolean;
  page?: number;
  limit?: number;
};

export const eventsApi = {
  list: (params?: EventsListParams) => {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.type) search.set('type', params.type);
    if (params?.modality) search.set('modality', params.modality);
    if (params?.clubId) search.set('clubId', params.clubId);
    if (params?.organizerId) search.set('organizerId', params.organizerId);
    if (params?.featured !== undefined) search.set('featured', String(params.featured));
    if (params?.upcoming !== undefined) search.set('upcoming', String(params.upcoming));
    if (params?.past !== undefined) search.set('past', String(params.past));
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const q = search.toString();
    return api<{ data: Event[]; total: number; page: number; limit: number }>(`/events${q ? `?${q}` : ''}`);
  },
  upcoming: (limit?: number) =>
    api<Event[]>(`/events/upcoming${limit ? `?limit=${limit}` : ''}`),
  downloadBulkTemplate: () => downloadTemplate('/events/bulk/template', 'plantilla-eventos.csv'),
  bulkImport: (file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi('/events/bulk', file, mode),
  past: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const q = params.toString();
    return api<{ data: Event[]; total: number; page: number; limit: number }>(`/events/past${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Event>(`/events/${id}`),
  create: (body: {
    title: string;
    description?: string;
    type: EventType;
    modality: EventModality;
    startsAt: string;
    endsAt?: string;
    location?: string;
    meetingUrl?: string;
    maxCapacity?: number;
    featured?: boolean;
    imageUrl?: string;
    clubId?: string;
  }) => api<Event>('/events', { method: 'POST', body: JSON.stringify(body) }),
  update: (
    id: string,
    body: {
      title?: string;
      description?: string;
      type?: EventType;
      modality?: EventModality;
      startsAt?: string;
      endsAt?: string;
      location?: string;
      meetingUrl?: string;
      maxCapacity?: number;
      featured?: boolean;
      imageUrl?: string;
      clubId?: string;
      status?: EventStatus;
    },
  ) => api<Event>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => api<Event>(`/events/${id}`, { method: 'DELETE' }),
  publish: (id: string) => api<Event>(`/events/${id}/publish`, { method: 'PATCH' }),
  cancel: (id: string) => api<Event>(`/events/${id}/cancel`, { method: 'PATCH' }),
  markFinished: (id: string) => api<Event>(`/events/${id}/finish`, { method: 'PATCH' }),
  listAttachments: (id: string) =>
    api<{ id: string; fileName: string; sizeBytes?: number }[]>(`/events/${id}/attachments`),
  uploadAttachment: async (id: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${id}/attachments`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    return res.json();
  },
  deleteAttachment: (eventId: string, attachmentId: string) =>
    api<unknown>(`/events/${eventId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};

export const clubApi = {
  getMe: () =>
    api<ClubMe>('/club/me'),
  getSummary: () =>
    api<ClubSummary>('/club/me/summary'),
  getPeriods: () =>
    api<{ id: string; name: string; startDate: string; endDate: string }[]>('/club/periods'),
  updateMe: (body: {
    logoUrl?: string;
    city?: string;
    zone?: string;
    foundedAt?: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) =>
    api<ClubMe>('/club/me', { method: 'PATCH', body: JSON.stringify(body) }),
  reports: {
    list: (params?: { periodId?: string; type?: string; status?: string }) => {
      const search = new URLSearchParams();
      if (params?.periodId) search.set('periodId', params.periodId);
      if (params?.type) search.set('type', params.type);
      if (params?.status) search.set('status', params.status);
      const q = search.toString();
      return api<{ items: ClubReport[]; total: number }>(`/club/reports${q ? `?${q}` : ''}`);
    },
    get: (id: string) => api<ClubReportDetail>(`/club/reports/${id}`),
    create: (body: { districtPeriodId: string; type: string; contentJson: string }) =>
      api<ClubReport>('/club/reports', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { contentJson?: string; responseToObservations?: string }) =>
      api<ClubReport>(`/club/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    submit: (id: string) => api<ClubReport>(`/club/reports/${id}/submit`, { method: 'POST' }),
    resubmit: (id: string) => api<ClubReport>(`/club/reports/${id}/resubmit`, { method: 'POST' }),
    listAttachments: (id: string) =>
      api<{ id: string; fileName: string; sizeBytes?: number }[]>(`/club/reports/${id}/attachments`),
    uploadAttachment: async (id: string, file: File) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/club/reports/${id}/attachments`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      return res.json();
    },
    deleteAttachment: (reportId: string, attachmentId: string) =>
      api<unknown>(`/club/reports/${reportId}/attachments/${attachmentId}`, { method: 'DELETE' }),
  },
  projects: {
    list: (status?: string) =>
      api<ClubProject[]>(`/club/projects${status ? `?status=${status}` : ''}`),
    downloadBulkTemplate: () => downloadTemplate('/club/projects/bulk/template', 'plantilla-proyectos.csv'),
    bulkImport: (file: File, mode?: 'partial' | 'strict') =>
      bulkImportApi('/club/projects/bulk', file, mode),
    get: (id: string) => api<ClubProjectDetail>(`/club/projects/${id}`),
    create: (body: {
      title: string;
      description?: string;
      status?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    }) =>
      api<ClubProject>('/club/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { title?: string; description?: string; category?: string; startDate?: string; endDate?: string }) =>
      api<ClubProject>(`/club/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    updateStatus: (id: string, status: string) =>
      api<ClubProject>(`/club/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    addProgress: (id: string, body: { description: string; progressDate: string }) =>
      api<unknown>(`/club/projects/${id}/progress`, { method: 'POST', body: JSON.stringify(body) }),
    listAttachments: (id: string) =>
      api<{ id: string; fileName: string }[]>(`/club/projects/${id}/attachments`),
    uploadAttachment: async (id: string, file: File) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/club/projects/${id}/attachments`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      return res.json();
    },
    deleteAttachment: (projectId: string, attachmentId: string) =>
      api<unknown>(`/club/projects/${projectId}/attachments/${attachmentId}`, { method: 'DELETE' }),
  },
  members: {
    list: (params?: {
      status?: string;
      title?: string;
      search?: string;
      includeDeleted?: boolean;
      page?: number;
      limit?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.title) search.set('title', params.title);
      if (params?.search) search.set('search', params.search);
      if (params?.includeDeleted) search.set('includeDeleted', 'true');
      if (params?.page) search.set('page', String(params.page));
      if (params?.limit) search.set('limit', String(params.limit));
      const q = search.toString();
      return api<{
        items: ClubMember[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/club/members${q ? `?${q}` : ''}`);
    },
    get: (id: string) => api<ClubMemberDetail>(`/club/members/${id}`),
    getHistory: (id: string) => api<{ action: string; createdAt: string; actorUserId?: string; metadataJson?: string }[]>(`/club/members/${id}/history`),
    getIncompleteProfiles: () => api<ClubMemberSummary[]>(`/club/members/incomplete-profiles`),
    downloadBulkTemplate: () => downloadTemplate('/club/members/bulk/template', 'plantilla-socios.csv'),
    bulkImport: (file: File, mode?: 'partial' | 'strict') =>
      bulkImportApi('/club/members/bulk', file, mode),
    create: (body: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      birthDate?: string;
      joinedAt?: string;
      status?: string;
      title?: string;
      internalNotes?: string;
    }) => api<ClubMember>('/club/members', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      birthDate: string;
      joinedAt: string;
      status: string;
      title: string;
      internalNotes: string;
    }>) => api<ClubMember>(`/club/members/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    changeStatus: (id: string, status: string) =>
      api<ClubMember>(`/club/members/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    assignPresident: (id: string) =>
      api<ClubMember>(`/club/members/${id}/president`, { method: 'POST' }),
    uploadAvatar: async (memberId: string, file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/club/members/${memberId}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
      }
      return res.json() as Promise<{ photoUrl: string }>;
    },
    delete: (id: string) =>
      api<{ success: boolean }>(`/club/members/${id}`, { method: 'DELETE' }),
  },
};

export type ClubMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  birthDate?: string | null;
  joinedAt?: string | null;
  status: string;
  title?: string | null;
  isPresident: boolean;
  internalNotes?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string } | null;
};

export type ClubMemberDetail = ClubMember;

export type ClubMemberSummary = Pick<ClubMember, 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'joinedAt' | 'birthDate'>;

export type ClubReport = {
  id: string;
  type: string;
  status: string;
  submittedAt?: string | null;
  districtPeriod: { id: string; name: string };
};

export type ClubReportDetail = ClubReport & {
  contentJson?: string | null;
  observations?: string | null;
  responseToObservations?: string | null;
};

export type ClubProject = {
  id: string;
  title: string;
  status: string;
  category?: string | null;
};

export type ClubProjectDetail = ClubProject & {
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress: { id: string; description: string; progressDate: string }[];
  assignedTo?: { fullName: string } | null;
};

export type ClubMe = {
  id: string;
  name: string;
  code: string;
  status: string;
  logoUrl?: string | null;
  city?: string | null;
  zone?: string | null;
  foundedAt?: string | null;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  informeAlDia: boolean;
  cuotaAldia: boolean;
  memberships: {
    id: string;
    title: string | null;
    isPresident: boolean;
    user: { id: string; fullName: string; email: string };
  }[];
};

export type ClubSummary = ClubMe & {
  recentActivity?: {
    type: 'report' | 'project';
    id: string;
    label: string;
    status: string;
    date: string;
  }[];
};

export type OpportunityType =
  | 'EMPLEO'
  | 'PASANTIA'
  | 'BECA'
  | 'VOLUNTARIADO'
  | 'CAPACITACION'
  | 'LIDERAZGO'
  | 'CONVOCATORIA';
export type OpportunityModality = 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  requirements?: string | null;
  type: OpportunityType;
  modality: OpportunityModality;
  area?: string | null;
  organization?: string | null;
  externalUrl?: string | null;
  deadlineAt?: string | null;
  status: OpportunityStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; fullName: string };
};

export const opportunitiesApi = {
  list: (params?: {
    type?: OpportunityType;
    modality?: OpportunityModality;
    organization?: string;
    area?: string;
    status?: OpportunityStatus;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.modality) search.set('modality', params.modality);
    if (params?.organization) search.set('organization', params.organization);
    if (params?.area) search.set('area', params.area);
    if (params?.status) search.set('status', params.status);
    if (params?.activeOnly !== undefined) search.set('activeOnly', String(params.activeOnly));
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const q = search.toString();
    return api<{
      items: Opportunity[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/opportunities${q ? `?${q}` : ''}`);
  },
  get: (id: string) => api<Opportunity>(`/opportunities/${id}`),
  downloadBulkTemplate: () => downloadTemplate('/opportunities/bulk/template', 'plantilla-oportunidades.csv'),
  bulkImport: (file: File, mode?: 'partial' | 'strict') =>
    bulkImportApi('/opportunities/bulk', file, mode),
  create: (body: {
    title: string;
    description?: string;
    requirements?: string;
    type: OpportunityType;
    modality: OpportunityModality;
    area?: string;
    organization?: string;
    externalUrl?: string;
    deadlineAt?: string;
  }) =>
    api<Opportunity>('/opportunities', { method: 'POST', body: JSON.stringify(body) }),
  update: (
    id: string,
    body: Partial<{
      title: string;
      description: string;
      requirements: string;
      type: OpportunityType;
      modality: OpportunityModality;
      area: string;
      organization: string;
      externalUrl: string;
      deadlineAt: string;
    }>,
  ) =>
    api<Opportunity>(`/opportunities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  publish: (id: string) =>
    api<Opportunity>(`/opportunities/${id}/publish`, { method: 'POST' }),
  archive: (id: string) =>
    api<Opportunity>(`/opportunities/${id}/archive`, { method: 'PATCH' }),
};

/** CV experience item: company, role, dates, current job, description */
export type CvExperience = {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
};

/** CV education item: institution, degree, field, dates */
export type CvEducation = {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
};

/** CV language item: language name and level (e.g. A1–C2, Nativo) */
export type CvLanguage = {
  language: string;
  level: string;
};

export function parseExperienceJson(s: string | null | undefined): CvExperience[] {
  if (s == null || s === '') return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CvExperience =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as CvExperience).company === 'string' &&
        typeof (x as CvExperience).role === 'string',
    );
  } catch {
    return [];
  }
}

export function parseEducationJson(s: string | null | undefined): CvEducation[] {
  if (s == null || s === '') return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CvEducation =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as CvEducation).institution === 'string' &&
        typeof (x as CvEducation).degree === 'string',
    );
  } catch {
    return [];
  }
}

export function parseLanguagesJson(s: string | null | undefined): CvLanguage[] {
  if (s == null || s === '') return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CvLanguage =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as CvLanguage).language === 'string' &&
        typeof (x as CvLanguage).level === 'string',
    );
  } catch {
    return [];
  }
}

export type UserProfile = {
  id: string | null;
  userId: string;
  photoUrl?: string | null;
  profession?: string | null;
  bio?: string | null;
  city?: string | null;
  linkedInUrl?: string | null;
  skills: string[];
  interests: string[];
  experienceJson?: string | null;
  educationJson?: string | null;
  languagesJson?: string | null;
  availability?: string | null;
  contactEmailPublic: boolean;
  talentVisible: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function getAvatarUrl(userId: string): string {
  return `${API_URL}/profile/avatar/${userId}`;
}

export const profileApi = {
  getMe: () => api<UserProfile>('/profile/me'),
  upsert: (body: Partial<{
    profession: string;
    bio: string;
    city: string;
    linkedInUrl: string;
    skills: string[];
    interests: string[];
    experienceJson: string;
    educationJson: string;
    languagesJson: string;
    availability: string;
    contactEmailPublic: boolean;
    talentVisible: boolean;
  }>) =>
    api<UserProfile>('/profile/me', { method: 'PUT', body: JSON.stringify(body) }),
  updateVisibility: (talentVisible: boolean) =>
    api<UserProfile>('/profile/me/visibility', {
      method: 'PATCH',
      body: JSON.stringify({ talentVisible }),
    }),
  uploadAvatar: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/profile/me/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || res.statusText);
    }
    return res.json() as Promise<{ photoUrl: string }>;
  },
};

export type TalentCard = {
  id: string;
  fullName: string;
  profession: string | null;
  bio: string | null;
  city: string | null;
  linkedInUrl: string | null;
  clubs: { id: string; name: string; code: string }[];
  email?: string;
};

export const talentApi = {
  search: (params?: {
    q?: string;
    clubId?: string;
    profession?: string;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.clubId) search.set('clubId', params.clubId);
    if (params?.profession) search.set('profession', params.profession);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const q = search.toString();
    return api<{
      items: TalentCard[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/talent/search${q ? `?${q}` : ''}`);
  },
  get: (userId: string) => api<TalentCard>(`/talent/${userId}`),
};

export const talentPublicApi = {
  list: (params?: {
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const q = search.toString();
    return api<{
      items: TalentCard[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/talent${q ? `?${q}` : ''}`);
  },
};

export const companiesApi = {
  register: (body: {
    name: string;
    country?: string;
    city?: string;
    industry?: string;
    size?: string;
    website?: string;
    contactName: string;
    contactEmail: string;
    phone?: string;
    password: string;
  }) => api<{ company: unknown }>('/companies/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  getMe: () => api<unknown>('/companies/me'),
  updateMe: (body: {
    country?: string;
    city?: string;
    industry?: string;
    size?: string;
    website?: string;
    contactName?: string;
    contactEmail?: string;
    phone?: string;
  }) => api<unknown>('/companies/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
};

export const historyApi = {
  meetings: () => api<unknown[]>('/history/meetings'),
  meeting: (id: string) => api<unknown>(`/history/meetings/${id}`),
  audit: (meetingId: string) => api<unknown[]>(`/history/meetings/${meetingId}/audit`),
  exportVotes: (meetingId: string) => api<{ csv: string }>(`/history/meetings/${meetingId}/votes/export`),
  voteSessions: (meetingId: string) =>
    api<{ id: string; topicId: string; topicTitle?: string; status: string; openedAt: string; closedAt?: string }[]>(
      `/history/meetings/${meetingId}/votes`,
    ),
  downloadCsv: async (meetingId: string) => {
    const { csv } = await historyApi.exportVotes(meetingId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `votes-${meetingId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const actaApi = {
  get: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/acta`),
  generate: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/acta/generate`, { method: 'POST' }),
  update: (meetingId: string, contentJson: string) =>
    api<unknown>(`/meetings/${meetingId}/acta`, { method: 'PATCH', body: JSON.stringify({ contentJson }) }),
  publish: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/acta/publish`, { method: 'POST' }),
  downloadPdf: async (meetingId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mi_rotaract_token') : null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/meetings/${meetingId}/acta/pdf`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('Error al descargar PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acta-${meetingId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
