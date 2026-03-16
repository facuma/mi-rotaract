'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NuevoInformePage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clubApi.getPeriods().then(setPeriods).catch(() => setPeriods([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const districtPeriodId = (form.elements.namedItem('periodId') as HTMLSelectElement)?.value;
    const type = (form.elements.namedItem('type') as HTMLSelectElement)?.value;
    const contentJson = (form.elements.namedItem('contentJson') as HTMLTextAreaElement)?.value;

    if (!districtPeriodId || !type || !contentJson) {
      setError('Complete todos los campos');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const report = await clubApi.reports.create({
        districtPeriodId,
        type,
        contentJson,
      });
      router.push(`/club/informes/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/club/informes">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo informe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div>
              <Label htmlFor="periodId">Período</Label>
              <select
                id="periodId"
                name="periodId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccione período</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccione tipo</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
            <div>
              <Label htmlFor="contentJson">Contenido</Label>
              <Textarea
                id="contentJson"
                name="contentJson"
                rows={8}
                required
                placeholder="Escriba el contenido del informe..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear borrador'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/club/informes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
