'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  clubApi,
  type ClubMember,
  type ClubMemberSummary,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateMemberModal } from '@/components/club/members/CreateMemberModal';
import { BulkImportModal } from '@/components/bulk-import';
import { AvatarImage } from '@/components/AvatarImage';

const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'LICENCIA', 'EGRESADO', 'PENDIENTE'] as const;

export default function ClubSociosPage() {
  const [data, setData] = useState<{
    items: ClubMember[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [incomplete, setIncomplete] = useState<ClubMemberSummary[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const fetchMembers = () => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    clubApi.members
      .list(params)
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    fetchMembers();
  }, [page, statusFilter]);

  useEffect(() => {
    clubApi.members
      .getIncompleteProfiles()
      .then(setIncomplete)
      .catch(() => setIncomplete([]));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const handleCreated = () => {
    setCreateOpen(false);
    fetchMembers();
    clubApi.members.getIncompleteProfiles().then(setIncomplete).catch(() => {});
  };

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/club">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestión de socios"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              Importar CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}>Nuevo socio</Button>
          </div>
        }
      />

      {incomplete && incomplete.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Perfiles incompletos ({incomplete.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Los siguientes socios tienen datos faltantes (teléfono, fecha de ingreso o fecha de nacimiento).
            </p>
            <div className="flex flex-wrap gap-2">
              {incomplete.slice(0, 5).map((m) => (
                <Link key={m.id} href={`/club/socios/${m.id}`}>
                  <Button variant="outline" size="sm">
                    {m.firstName} {m.lastName}
                  </Button>
                </Link>
              ))}
              {incomplete.length > 5 && (
                <span className="text-sm text-muted-foreground">
                  y {incomplete.length - 5} más
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {MEMBER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-48 w-full" />
          ) : !data.items || data.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No hay socios"
                description="Agregá el primero para empezar."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    Agregar socio
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarImage
                              userId={m.id}
                              alt={`${m.firstName} ${m.lastName}`}
                              fallback={`${m.firstName} ${m.lastName}`}
                              size={32}
                              className="shrink-0"
                            />
                            <span className="font-medium">
                              {m.firstName} {m.lastName}
                              {m.isPresident && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  (Presidente)
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.email}</TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} />
                        </TableCell>
                        <TableCell>{m.title ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/club/socios/${m.id}`}>Ver</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {data.page} de {data.totalPages} ({data.total} socios)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateMemberModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <BulkImportModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Importar socios"
        description="Subí un archivo CSV con la plantilla de socios. Usá UTF-8 para caracteres especiales."
        onDownloadTemplate={clubApi.members.downloadBulkTemplate}
        onImport={(file, mode) => clubApi.members.bulkImport(file, mode)}
        onSuccess={() => {
          fetchMembers();
          clubApi.members.getIncompleteProfiles().then(setIncomplete).catch(() => {});
        }}
      />
    </div>
  );
}
