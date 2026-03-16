import { Role } from '@prisma/client';

export type WidgetType = 'list' | 'cards' | 'shortcuts' | 'alerts' | 'indicators';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  data: unknown;
  emptyMessage?: string;
}

export interface DashboardResponse {
  role: Role;
  widgets: DashboardWidget[];
}

export interface UpcomingMeetingsData {
  items: {
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
    href: string;
  }[];
  emptyActionHref?: string;
}

export interface UpcomingEventsData {
  items: {
    id: string;
    title: string;
    startsAt: string;
    type: string;
    href: string;
  }[];
}

export interface ShortcutItem {
  id: string;
  label: string;
  href: string;
}

export interface ShortcutsData {
  items: ShortcutItem[];
}

export type AlertType =
  | 'report_due'
  | 'report_overdue'
  | 'project_stale'
  | 'club_report_pending'
  | 'report_observed'
  | 'report_rejected';

export interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
  href: string;
}

export interface AlertsData {
  items: AlertItem[];
}

export interface IndicatorItem {
  id: string;
  label: string;
  value: boolean | string;
  href?: string;
}

export interface IndicatorsData {
  items: IndicatorItem[];
}
