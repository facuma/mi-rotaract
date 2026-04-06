export const MEETING_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  LIVE: 'En vivo',
  PAUSED: 'Pausada',
  FINISHED: 'Finalizada',
  ARCHIVED: 'Archivada',
};

export const TOPIC_TYPE_LABELS: Record<string, string> = {
  DISCUSSION: 'Discusión',
  VOTING: 'Votación',
  INFORMATIVE: 'Informativo',
};

export const TOPIC_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
};

export const SPEAKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptado',
};

export const MEETING_STATUS_ORDER = [
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'FINISHED',
] as const;
