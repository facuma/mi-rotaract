import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

type Item = {
  id: string;
  label: string;
  value: boolean | string;
  href?: string;
};

type Props = {
  items: Item[];
  emptyMessage: string;
};

export function WidgetIndicators({ items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Indicadores del club</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={emptyMessage} variant="compact" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Indicadores del club</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map((i) => {
            const displayValue =
              typeof i.value === 'boolean' ? (i.value ? 'Sí' : 'No') : String(i.value);
            const isPositive = displayValue === 'Sí';
            const content = (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{i.label}</p>
                <p
                  className={
                    isPositive
                      ? 'mt-0.5 font-semibold text-success'
                      : 'mt-0.5 font-semibold text-warning'
                  }
                >
                  {displayValue}
                </p>
              </div>
            );
            return i.href ? (
              <Link key={i.id} href={i.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={i.id}>{content}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
