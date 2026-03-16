'use client';

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
import type { Club } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

type ClubsTableProps = {
  clubs: Club[];
  onEdit: (club: Club) => void;
  onDelete: (club: Club) => void;
};

export function ClubsTable({ clubs, onEdit, onDelete }: ClubsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Email presidente</TableHead>
          <TableHead>Participa en reuniones</TableHead>
          <TableHead>Cuota al día</TableHead>
          <TableHead>Informe al día</TableHead>
          <TableHead className="w-[120px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clubs.map((club) => (
          <TableRow key={club.id}>
            <TableCell className="font-medium">{club.name}</TableCell>
            <TableCell>
              <Badge variant={club.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {STATUS_LABEL[club.status] ?? club.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {club.presidentEmail ?? '—'}
            </TableCell>
            <TableCell>
              <Badge variant={club.enabledForDistrictMeetings ? 'default' : 'secondary'}>
                {club.enabledForDistrictMeetings ? 'Sí' : 'No'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={club.cuotaAldia ? 'default' : 'outline'}>
                {club.cuotaAldia ? 'Sí' : 'No'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={club.informeAlDia ? 'default' : 'outline'}>
                {club.informeAlDia ? 'Sí' : 'No'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(club)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(club)}
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
