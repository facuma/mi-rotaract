'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { districtApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Club = {
  id: string;
  name: string;
  code: string;
  status: string;
  informeAlDia: boolean;
  cuotaAldia: boolean;
  enabledForDistrictMeetings: boolean;
};

export default function DistrictClubesPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    districtApi.clubs
      .list({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      })
      .then((c) => setClubs(c as Club[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  if (loading && clubs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
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
            <CardTitle>Clubes — Vista distrito</CardTitle>
            <CardDescription>Ficha institucional, autoridades y métricas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-4">
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
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mr-2">Buscar</label>
              <input
                type="text"
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="Nombre o código"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ul className="divide-y">
            {clubs.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.name} ({c.code})</p>
                  <p className="text-xs text-muted-foreground">
                    Estado: {c.status} · Informe al día: {c.informeAlDia ? 'Sí' : 'No'} · Reuniones: {c.enabledForDistrictMeetings ? 'Sí' : 'No'}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/district/clubes/${c.id}`}>Ver ficha</Link>
                </Button>
              </li>
            ))}
          </ul>
          {clubs.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No hay clubes con los filtros seleccionados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
