'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubApi, type ClubReportDetail } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EditarInformePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport] = useState<ClubReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    clubApi.reports.get(id).then(setReport).catch((e) => setError(e.message));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const contentJson = (form.elements.namedItem('contentJson') as HTMLTextAreaElement)?.value;
    const responseToObservations = (form.elements.namedItem('responseToObservations') as HTMLTextAreaElement)?.value;
    if (!contentJson) return;

    setLoading(true);
    setError('');
    try {
      await clubApi.reports.update(id, {
        contentJson,
        ...(responseToObservations && { responseToObservations }),
      });
      router.push(`/club/informes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!report && !error) return <div className="animate-pulse h-24 bg-muted rounded" />;
  if (error && !report) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href={`/club/informes/${id}`}>Volver</Link>
        </Button>
      </div>
    );
  }
  if (!report) return null;

  const canEdit = report.status === 'DRAFT' || report.status === 'OBSERVED' || report.status === 'REJECTED';
  if (!canEdit) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No se puede editar este informe.</p>
        <Button variant="outline" asChild>
          <Link href={`/club/informes/${id}`}>Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/club/informes/${id}`}>← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editar informe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label htmlFor="contentJson">Contenido</Label>
              <Textarea
                id="contentJson"
                name="contentJson"
                rows={8}
                defaultValue={report.contentJson ?? ''}
                required
              />
            </div>
            {(report.status === 'OBSERVED' || report.status === 'REJECTED') && (
              <div>
                <Label htmlFor="responseToObservations">Respuesta a observaciones</Label>
                <Textarea
                  id="responseToObservations"
                  name="responseToObservations"
                  rows={4}
                  defaultValue={report.responseToObservations ?? ''}
                  placeholder="Responda las observaciones del distrito..."
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/club/informes/${id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
