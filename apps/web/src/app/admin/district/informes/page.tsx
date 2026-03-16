'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { districtApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Period = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean };
type ReportItem = {
  id: string;
  status: string;
  type: string;
  submittedAt: string | null;
  club: { id: string; name: string; code: string };
  districtPeriod: { id: string; name: string };
};

export default function DistrictInformesPage() {
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState<string>('');
  const [clubIdFilter, setClubIdFilter] = useState<string>(searchParams.get('clubId') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [data, setData] = useState<{ items: ReportItem[]; total: number } | null>(null);
  const [missing, setMissing] = useState<{ periodName: string; missing: { clubName: string; clubCode: string; type: string }[] } | null>(null);
  const [summary, setSummary] = useState<{
    periodName: string;
    activeClubsCount: number;
    reportsSubmitted: number;
    pctClubesAlDia: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    districtApi.periods
      .list()
      .then((p) => {
        setPeriods(p as Period[]);
        const current = p.find((x: { isCurrent: boolean }) => x.isCurrent);
        if (current) setPeriodId((current as Period).id);
        else if (p.length) setPeriodId((p[0] as Period).id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!periodId) return;
    setLoading(true);
    Promise.all([
      districtApi.reports.list({ periodId, clubId: clubIdFilter || undefined, status: statusFilter || undefined, type: typeFilter || undefined }),
      districtApi.reports.getMissing(periodId, typeFilter || undefined),
      districtApi.reports.getSummary(periodId, typeFilter || undefined),
    ])
      .then(([list, miss, sum]) => {
        setData(list as { items: ReportItem[]; total: number });
        setMissing(miss as { periodName: string; missing: { clubName: string; clubCode: string; type: string }[] });
        setSummary(sum as { periodName: string; activeClubsCount: number; reportsSubmitted: number; pctClubesAlDia: number });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodId, clubIdFilter, statusFilter, typeFilter]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
            <CardTitle>Informes distritales</CardTitle>
            <CardDescription>Listado, faltantes y cumplimiento por período</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mr-2">Período</label>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {clubIdFilter && (
              <div>
                <span className="text-sm text-muted-foreground">Filtrando por club</span>
                <Button variant="ghost" size="sm" onClick={() => setClubIdFilter('')}>Limpiar</Button>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mr-2">Estado</label>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="SUBMITTED">Enviado</option>
                <option value="OBSERVED">Observado</option>
                <option value="APPROVED">Aprobado</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mr-2">Tipo</label>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </div>

          {summary && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Clubes activos</p>
                <p className="text-2xl font-semibold">{summary.activeClubsCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Informes enviados</p>
                <p className="text-2xl font-semibold">{summary.reportsSubmitted}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">% clubes al día</p>
                <p className="text-2xl font-semibold">{summary.pctClubesAlDia}%</p>
              </div>
            </div>
          )}

          {missing && missing.missing.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Informes faltantes ({missing.missing.length})</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {missing.missing.slice(0, 10).map((m, i) => (
                  <li key={i}>{m.clubName} ({m.clubCode}) — {m.type}</li>
                ))}
                {missing.missing.length > 10 && (
                  <li>… y {missing.missing.length - 10} más</li>
                )}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-2">Listado de informes</h3>
            {!periodId ? (
              <p className="text-sm text-muted-foreground">Seleccione un período para ver el listado.</p>
            ) : data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay informes con los filtros seleccionados.</p>
            ) : (
              <ul className="divide-y">
                {data?.items.map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">
                      {r.club.name} ({r.club.code}) — {r.type} — {r.status}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/district/informes/${r.id}`}>Ver</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
