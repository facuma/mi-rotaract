'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EventType, EventModality } from '@/lib/api';
import type { Club } from '@/lib/api';

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'DISTRITAL', label: 'Distrital' },
  { value: 'CLUB', label: 'Club' },
  { value: 'CAPACITACION', label: 'Capacitación' },
  { value: 'REUNION', label: 'Reunión' },
  { value: 'ASAMBLEA', label: 'Asamblea' },
  { value: 'PROYECTO_SERVICIO', label: 'Proyecto de servicio' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'PROFESIONAL', label: 'Profesional' },
];

const MODALITY_OPTIONS: { value: EventModality; label: string }[] = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HIBRIDA', label: 'Híbrida' },
];

export type EventFiltersState = {
  from?: string;
  to?: string;
  type?: EventType;
  modality?: EventModality;
  clubId?: string;
};

type EventFiltersProps = {
  filters: EventFiltersState;
  onFiltersChange: (f: EventFiltersState) => void;
  clubs?: Club[];
};

export function EventFilters({ filters, onFiltersChange, clubs }: EventFiltersProps) {
  const set = useCallback(
    (key: keyof EventFiltersState, value: string | undefined) => {
      onFiltersChange({
        ...filters,
        [key]: value || undefined,
      });
    },
    [filters, onFiltersChange],
  );

  const clear = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="filter-from" className="text-xs">
            Desde
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => set('from', e.target.value)}
            className="w-full sm:w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-to" className="text-xs">
            Hasta
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => set('to', e.target.value)}
            className="w-full sm:w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={filters.type ?? 'all'}
            onValueChange={(v) => set('type', v === 'all' ? undefined : (v as EventType))}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {EVENT_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modalidad</Label>
          <Select
            value={filters.modality ?? 'all'}
            onValueChange={(v) =>
              set('modality', v === 'all' ? undefined : (v as EventModality))
            }
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {MODALITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {clubs && clubs.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Club</Label>
            <Select
              value={filters.clubId ?? 'all'}
              onValueChange={(v) => set('clubId', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
