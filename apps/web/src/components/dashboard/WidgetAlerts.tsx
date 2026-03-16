import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Item = {
  id: string;
  type: string;
  message: string;
  href: string;
};

type Props = {
  items: Item[];
  emptyMessage: string;
};

export function WidgetAlerts({ items, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <Card className="border-success/30 bg-success/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-success">
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-success/90">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-warning">
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id}>
              <Button
                variant="link"
                className="h-auto p-0 font-medium text-left text-warning hover:text-warning/80"
                asChild
              >
                <Link href={a.href}>{a.message}</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
