import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

type Item = {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  href: string;
};

type Props = {
  items: Item[];
  emptyMessage: string;
  emptyActionHref?: string;
};

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Programada',
  LIVE: 'En vivo',
  DRAFT: 'Borrador',
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WidgetUpcomingMeetings({ items, emptyMessage, emptyActionHref = '/meetings' }: Props) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas reuniones</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={emptyMessage}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={emptyActionHref}>Ver reuniones</Link>
              </Button>
            }
            variant="compact"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Próximas reuniones</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={emptyActionHref}>
            Ver todas
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <Button variant="link" className="h-auto p-0 font-medium text-left" asChild>
                <Link href={m.href}>{m.title}</Link>
              </Button>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(m.scheduledAt)}</span>
                <span>{statusLabel[m.status] ?? m.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
