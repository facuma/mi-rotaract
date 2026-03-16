'use client';

import { useState, useEffect } from 'react';
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
import type { Event, EventType, EventModality } from '@/lib/api';
import type { Club } from '@/lib/api';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'DISTRITAL', label: 'Distrital' },
  { value: 'CLUB', label: 'Club' },
  { value: 'CAPACITACION', label: 'Capacitación' },
  { value: 'REUNION', label: 'Reunión' },
  { value: 'ASAMBLEA', label: 'Asamblea' },
  { value: 'PROYECTO_SERVICIO', label: 'Proyecto de servicio' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'PROFESIONAL', label: 'Profesional' },
];

const MODALITIES: { value: EventModality; label: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HIBRIDA', label: 'Híbrida' },
];

export type EventFormData = {
  title: string;
  description?: string;
  type: EventType;
  modality: EventModality;
  startsAt: string;
  endsAt?: string;
  location?: string;
  meetingUrl?: string;
  maxCapacity?: number;
  featured?: boolean;
  imageUrl?: string;
  clubId?: string;
};

function toFormData(e?: Event | null): EventFormData {
  if (!e) {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    start.setHours(18, 0, 0, 0);
    return {
      title: '',
      description: '',
      type: 'REUNION',
      modality: 'PRESENCIAL',
      startsAt: start.toISOString().slice(0, 16),
      endsAt: '',
      location: '',
      meetingUrl: '',
      maxCapacity: undefined,
      featured: false,
      imageUrl: '',
      clubId: undefined,
    };
  }
  return {
    title: e.title,
    description: e.description ?? '',
    type: e.type,
    modality: e.modality,
    startsAt: e.startsAt.slice(0, 16),
    endsAt: e.endsAt ? e.endsAt.slice(0, 16) : '',
    location: e.location ?? '',
    meetingUrl: e.meetingUrl ?? '',
    maxCapacity: e.maxCapacity ?? undefined,
    featured: e.featured ?? false,
    imageUrl: e.imageUrl ?? '',
    clubId: e.clubId ?? undefined,
  };
}

type EventFormProps = {
  event?: Event | null;
  clubs?: Club[];
  isPresident?: boolean;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel?: () => void;
};

export function EventForm({
  event,
  clubs = [],
  isPresident,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [data, setData] = useState<EventFormData>(() => toFormData(event));

  useEffect(() => {
    setData(toFormData(event));
  }, [event]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        ...data,
        description: data.description || undefined,
        endsAt: data.endsAt || undefined,
        location: data.location || undefined,
        meetingUrl: data.meetingUrl || undefined,
        maxCapacity: data.maxCapacity || undefined,
        imageUrl: data.imageUrl || undefined,
        clubId: data.clubId || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof EventFormData, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => set('title', e.target.value)}
          required
          placeholder="Ej: Asamblea Distrital"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Descripción del evento"
          disabled={loading}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select
            value={data.type}
            onValueChange={(v) => set('type', v as EventType)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Modalidad *</Label>
          <Select
            value={data.modality}
            onValueChange={(v) => set('modality', v as EventModality)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODALITIES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Fecha y hora inicio *</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            value={data.startsAt}
            onChange={(e) => set('startsAt', e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">Fecha y hora fin</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            value={data.endsAt}
            onChange={(e) => set('endsAt', e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {!isPresident && (
        <div className="space-y-2">
          <Label>Club</Label>
          <Select
            value={data.clubId ?? 'none'}
            onValueChange={(v) => set('clubId', v === 'none' ? undefined : v)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Distrital (sin club)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Distrital (sin club)</SelectItem>
              {clubs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isPresident && (
        <div className="space-y-2">
          <Label>Club *</Label>
          <p className="text-xs text-muted-foreground">
            Solo podés crear eventos para clubes que presidís.
          </p>
          {clubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés clubes asignados como presidente.
            </p>
          ) : (
          <Select
            value={data.clubId ?? ''}
            onValueChange={(v) => set('clubId', v)}
            required
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={data.location}
          onChange={(e) => set('location', e.target.value)}
          placeholder="Dirección si es presencial"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meetingUrl">Link de reunión</Label>
        <Input
          id="meetingUrl"
          type="url"
          value={data.meetingUrl}
          onChange={(e) => set('meetingUrl', e.target.value)}
          placeholder="https://meet.google.com/..."
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxCapacity">Cupo máximo</Label>
        <Input
          id="maxCapacity"
          type="number"
          min={1}
          value={data.maxCapacity ?? ''}
          onChange={(e) =>
            set('maxCapacity', e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          placeholder="Sin límite"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">URL de imagen</Label>
        <Input
          id="imageUrl"
          type="url"
          value={data.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://..."
          disabled={loading}
        />
      </div>

      {!isPresident && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={data.featured}
            onChange={(e) => set('featured', e.target.checked)}
            disabled={loading}
            className="h-4 w-4"
          />
          <Label htmlFor="featured">Destacado</Label>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : event ? 'Guardar cambios' : 'Crear evento'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
