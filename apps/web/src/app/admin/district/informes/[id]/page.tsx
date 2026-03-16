'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { districtApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Report = {
  id: string;
  status: string;
  type: string;
  observations: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  club: { id: string; name: string; code: string };
  districtPeriod: { id: string; name: string };
  reviewer?: { fullName: string } | null;
};

export default function DistrictInformeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    districtApi.reports
      .get(id)
      .then((r) => {
        const rep = r as Report;
        setReport(rep);
        setObservations(rep.observations ?? '');
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const handleSaveObservations = async () => {
    setSaving(true);
    setError('');
    districtApi.reports
      .update(id, { observations })
      .then(() => {
        setReport((prev) => (prev ? { ...prev, observations } : null));
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleStatus = async (status: string) => {
    setSaving(true);
    setError('');
    districtApi.reports
      .update(id, { status, observations: observations || undefined })
      .then((updated) => {
        setReport(updated as Report);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (!report && !error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !report) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" asChild className="mt-2">
            <Link href="/admin/district/informes">Volver</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/district/informes">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informe — {report.club.name} ({report.club.code})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Período: {report.districtPeriod.name} · Tipo: {report.type} · Estado: {report.status}
            {report.reviewer && ` · Revisado por ${report.reviewer.fullName}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <label className="text-sm font-medium">Observaciones</label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
              value={observations ?? report.observations ?? ''}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observaciones del distrito..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSaveObservations}
              disabled={saving}
            >
              Guardar observaciones
            </Button>
            {report.status !== 'OBSERVED' && (
              <Button
                variant="outline"
                onClick={() => handleStatus('OBSERVED')}
                disabled={saving}
              >
                Marcar observado
              </Button>
            )}
            {report.status !== 'APPROVED' && (
              <Button
                variant="default"
                onClick={() => handleStatus('APPROVED')}
                disabled={saving}
              >
                Aprobar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
