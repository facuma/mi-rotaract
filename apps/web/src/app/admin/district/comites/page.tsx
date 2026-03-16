'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { districtApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Committee = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coordinator: { id: string; fullName: string; email: string };
  districtPeriod?: { id: string; name: string } | null;
};

export default function DistrictComitesPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    districtApi.committees
      .list({ status: statusFilter || undefined })
      .then((c) => setCommittees(c as Committee[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  if (loading && committees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Comités</CardTitle>
            <CardDescription>Gestión de comités distritales</CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/district/comites/nuevo">Nuevo comité</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <label className="text-sm font-medium mr-2">Estado</label>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
              <option value="CLOSED">Cerrados</option>
            </select>
          </div>
          <ul className="divide-y">
            {committees.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Coordinador: {c.coordinator.fullName} · Estado: {c.status}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/district/comites/${c.id}`}>Ver</Link>
                </Button>
              </li>
            ))}
          </ul>
          {committees.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No hay comités. Crear uno desde &quot;Nuevo comité&quot;.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
