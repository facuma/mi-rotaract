import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Item = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  items: Item[];
};

export function WidgetShortcuts({ items }: Props) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Accesos rápidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="flex items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
