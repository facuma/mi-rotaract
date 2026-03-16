'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clubApi, type ClubReport } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function ClubInformesPage() {
  const [data, setData] = useState<{ items: ClubReport[]; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    clubApi.reports.list().then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

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
        title="Informes del club"
        action={
          <Button asChild>
            <Link href="/club/informes/nuevo">Nuevo informe</Link>
          </Button>
        }
      />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!data || data.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No hay informes"
                description="Creá uno para empezar."
                action={
                  <Button asChild>
                    <Link href="/club/informes/nuevo">Crear informe</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.districtPeriod?.name ?? '—'}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        {r.submittedAt
                          ? new Date(r.submittedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/club/informes/${r.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
