'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { opportunitiesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import type { OpportunityType, OpportunityModality } from '@/lib/api';

const OPPORTUNITY_TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'EMPLEO', label: 'Empleo' },
  { value: 'PASANTIA', label: 'Pasantía' },
  { value: 'BECA', label: 'Beca' },
  { value: 'VOLUNTARIADO', label: 'Voluntariado' },
  { value: 'CAPACITACION', label: 'Capacitación' },
  { value: 'LIDERAZGO', label: 'Liderazgo' },
  { value: 'CONVOCATORIA', label: 'Convocatoria' },
];

const MODALITY_OPTIONS: { value: OpportunityModality; label: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HIBRIDA', label: 'Híbrida' },
];

export default function NuevaOportunidadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [type, setType] = useState<OpportunityType>('EMPLEO');
  const [modality, setModality] = useState<OpportunityModality>('PRESENCIAL');
  const [area, setArea] = useState('');
  const [organization, setOrganization] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setLoading(true);
    try {
      const opp = await opportunitiesApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        type,
        modality,
        area: area.trim() || undefined,
        organization: organization.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        deadlineAt: deadlineAt || undefined,
      });
      toast.success('Oportunidad creada. Puedes publicarla desde el detalle.');
      router.push(`/desarrollo-profesional/oportunidades/${opp.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/desarrollo-profesional/oportunidades">← Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Crear oportunidad</h1>
          <p className="text-sm text-muted-foreground">
            La oportunidad se creará en borrador. Podrás publicarla luego.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Desarrollador Frontend"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la oportunidad"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="requirements">Requisitos</Label>
              <Textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Requisitos para postularse"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as OpportunityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalidad</Label>
                <Select value={modality} onValueChange={(v) => setModality(v as OpportunityModality)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="organization">Organización</Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Nombre de la organización"
                />
              </div>
              <div>
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ej: Tecnología"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="externalUrl">Link externo</Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="deadlineAt">Fecha límite</Label>
              <Input
                id="deadlineAt"
                type="date"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear oportunidad'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/desarrollo-profesional/oportunidades">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
