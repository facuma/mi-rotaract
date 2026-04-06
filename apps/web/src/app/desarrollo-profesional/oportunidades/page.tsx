'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { opportunitiesApi, clubsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { BulkImportModal } from '@/components/bulk-import';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Opportunity,
  OpportunityType,
  OpportunityModality,
  Club,
} from '@/lib/api';

const OPPORTUNITY_TYPE_LABEL: Record<OpportunityType, string> = {
  EMPLEO: 'Empleo',
  PASANTIA: 'Pasantía',
  BECA: 'Beca',
  VOLUNTARIADO: 'Voluntariado',
  CAPACITACION: 'Capacitación',
  LIDERAZGO: 'Liderazgo',
  CONVOCATORIA: 'Convocatoria',
};

const MODALITY_LABEL: Record<OpportunityModality, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDA: 'Híbrida',
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isActive(opp: Opportunity) {
  if (opp.status !== 'PUBLISHED') return false;
  if (!opp.deadlineAt) return true;
  return new Date(opp.deadlineAt) >= new Date();
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const active = isActive(opp);
  return (
    <Link href={`/desarrollo-profesional/oportunidades/${opp.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={active ? 'default' : 'secondary'}>
              {active ? 'Activa' : 'Vencida'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {OPPORTUNITY_TYPE_LABEL[opp.type]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {MODALITY_LABEL[opp.modality]}
            </Badge>
          </div>
          <h3 className="mt-2 font-semibold">{opp.title}</h3>
          {opp.organization && (
            <p className="text-sm text-muted-foreground">{opp.organization}</p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {opp.deadlineAt && (
            <p className="text-xs text-muted-foreground">
              Fecha límite: {formatDate(opp.deadlineAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function OportunidadesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    items: Opportunity[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>('');
  const [modality, setModality] = useState<string>('');
  const [organization, setOrganization] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);

  const canPublish =
    user?.role === 'SECRETARY' || user?.role === 'PRESIDENT' || user?.role === 'RDR';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, clubsRes] = await Promise.all([
        opportunitiesApi.list({
          type: (type || undefined) as OpportunityType | undefined,
          modality: (modality || undefined) as OpportunityModality | undefined,
          organization: organization || undefined,
          activeOnly: activeOnly || undefined,
          page,
          limit: 20,
        }),
        canPublish ? clubsApi.list() : Promise.resolve([]),
      ]);
      setData(res);
      setClubs((clubsRes as Club[]) || []);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [type, modality, organization, activeOnly, page, canPublish]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Oportunidades"
        action={
          canPublish ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                Importar CSV
              </Button>
              <Button asChild>
                <Link href="/desarrollo-profesional/oportunidades/nueva">
                  Crear oportunidad
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {canPublish && (
        <BulkImportModal
          isOpen={bulkOpen}
          onClose={() => setBulkOpen(false)}
          title="Importar oportunidades"
          description="Subí un archivo CSV con la plantilla. Usá UTF-8."
          onDownloadTemplate={opportunitiesApi.downloadBulkTemplate}
          onImport={(file, mode) => opportunitiesApi.bulkImport(file, mode)}
          onSuccess={fetchData}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(OPPORTUNITY_TYPE_LABEL) as [OpportunityType, string][]
            ).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modality} onValueChange={setModality}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Modalidad" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(MODALITY_LABEL) as [
                OpportunityModality,
                string,
              ][]
            ).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Organización"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="max-w-[200px]"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Solo activas
        </label>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Filtrar
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="No hay oportunidades"
          description="No se encontraron oportunidades que coincidan con los filtros."
          action={
            canPublish ? (
              <Button asChild>
                <Link href="/desarrollo-profesional/oportunidades/nueva">
                  Crear oportunidad
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
