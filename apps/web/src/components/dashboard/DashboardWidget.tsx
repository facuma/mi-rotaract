import type { DashboardWidget as DashboardWidgetType } from '@/lib/api';
import { WidgetUpcomingMeetings } from './WidgetUpcomingMeetings';
import { WidgetUpcomingEvents } from './WidgetUpcomingEvents';
import { WidgetAlerts } from './WidgetAlerts';
import { WidgetShortcuts } from './WidgetShortcuts';
import { WidgetIndicators } from './WidgetIndicators';

type Props = {
  widget: DashboardWidgetType;
};

export function DashboardWidget({ widget }: Props) {
  switch (widget.id) {
    case 'upcoming-meetings': {
      const data = widget.data as {
        items: { id: string; title: string; scheduledAt: string; status: string; href: string }[];
        emptyActionHref?: string;
      };
      return (
        <WidgetUpcomingMeetings
          items={data?.items ?? []}
          emptyMessage={widget.emptyMessage ?? 'No hay reuniones próximas'}
          emptyActionHref={data?.emptyActionHref}
        />
      );
    }
    case 'upcoming-events': {
      const data = widget.data as { items: { id: string; title: string; startsAt: string; type: string; href: string }[] };
      return (
        <WidgetUpcomingEvents
          items={data?.items ?? []}
          emptyMessage={widget.emptyMessage ?? 'No hay eventos próximos'}
        />
      );
    }
    case 'alerts': {
      const data = widget.data as { items: { id: string; type: string; message: string; href: string }[] };
      return (
        <WidgetAlerts
          items={data?.items ?? []}
          emptyMessage={widget.emptyMessage ?? 'Sin alertas pendientes'}
        />
      );
    }
    case 'shortcuts': {
      const data = widget.data as { items: { id: string; label: string; href: string }[] };
      return <WidgetShortcuts items={data?.items ?? []} />;
    }
    case 'indicators': {
      const data = widget.data as { items: { id: string; label: string; value: boolean | string; href?: string }[] };
      return (
        <WidgetIndicators
          items={data?.items ?? []}
          emptyMessage={widget.emptyMessage ?? 'No hay indicadores'}
        />
      );
    }
    default:
      return null;
  }
}
