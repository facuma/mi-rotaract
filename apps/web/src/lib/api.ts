const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  get: (id: string) => api<unknown>(`/meetings/${id}`),
  create: (body: { title: string; description?: string; scheduledAt?: string; clubId: string }) =>
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
  open: (meetingId: string, topicId: string) =>
    api<unknown>(`/meetings/${meetingId}/vote/open`, { method: 'POST', body: JSON.stringify({ topicId }) }),
  close: (meetingId: string, voteSessionId: string) =>
    api<unknown>(`/meetings/${meetingId}/vote/close`, { method: 'POST', body: JSON.stringify({ voteSessionId }) }),
  vote: (meetingId: string, voteSessionId: string, choice: 'YES' | 'NO' | 'ABSTAIN') =>
    api<unknown>(`/meetings/${meetingId}/vote`, { method: 'POST', body: JSON.stringify({ voteSessionId, choice }) }),
  current: (meetingId: string) => api<unknown>(`/meetings/${meetingId}/vote/current`),
  result: (meetingId: string, voteSessionId: string) =>
    api<{ yes: number; no: number; abstain: number; total: number }>(`/meetings/${meetingId}/vote/${voteSessionId}/result`),
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

export const clubsApi = {
  list: () => api<{ id: string; name: string; code: string }[]>('/clubs'),
};

export const usersApi = {
  list: () =>
    api<{ id: string; fullName: string; email: string; role: string }[]>('/users'),
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
