'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string };
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  LIVE: 'En vivo',
  PAUSED: 'Pausada',
  FINISHED: 'Finalizada',
  ARCHIVED: 'Archivada',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'outline',
  LIVE: 'default',
  PAUSED: 'secondary',
  FINISHED: 'outline',
  ARCHIVED: 'secondary',
};

export function MeetingsTable({
  meetings,
  detailHref = (id) => `/admin/meetings/${id}`,
}: {
  meetings: Meeting[];
  detailHref?: (id: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Club</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {meetings.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.title}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[m.status] ?? 'secondary'}>
                {STATUS_LABEL[m.status] ?? m.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {m.scheduledAt
                ? new Date(m.scheduledAt).toLocaleString('es-AR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">{m.club?.name ?? '—'}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" asChild>
                <Link href={detailHref(m.id)}>Ver</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
