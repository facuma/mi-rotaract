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
import type { Event, EventType, EventModality } from '@/lib/api';

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  DISTRITAL: 'Distrital',
  CLUB: 'Club',
  CAPACITACION: 'Capacitación',
  REUNION: 'Reunión',
  ASAMBLEA: 'Asamblea',
  PROYECTO_SERVICIO: 'Proyecto',
  NETWORKING: 'Networking',
  PROFESIONAL: 'Profesional',
};

const MODALITY_LABEL: Record<EventModality, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDA: 'Híbrida',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  CANCELLED: 'Cancelado',
  FINISHED: 'Finalizado',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type EventsAdminTableProps = {
  events: Event[];
  onPublish: (e: Event) => void;
  onCancel: (e: Event) => void;
  onFinish: (e: Event) => void;
  onDelete: (e: Event) => void;
};

export function EventsAdminTable({
  events,
  onPublish,
  onCancel,
  onFinish,
  onDelete,
}: EventsAdminTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Modalidad</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-[180px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <Link
                href={`/eventos/${e.id}`}
                className="font-medium text-primary hover:underline"
              >
                {e.title}
              </Link>
              {e.featured && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Destacado
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {EVENT_TYPE_LABEL[e.type] ?? e.type}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {MODALITY_LABEL[e.modality] ?? e.modality}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(e.startsAt)}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  e.status === 'PUBLISHED'
                    ? 'default'
                    : e.status === 'CANCELLED'
                      ? 'destructive'
                      : 'outline'
                }
              >
                {STATUS_LABEL[e.status] ?? e.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/eventos/${e.id}/editar`}>Editar</Link>
                </Button>
                {e.status === 'DRAFT' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPublish(e)}
                  >
                    Publicar
                  </Button>
                )}
                {e.status === 'PUBLISHED' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => onCancel(e)}>
                      Cancelar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onFinish(e)}>
                      Finalizar
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(e)}
                >
                  Eliminar
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
