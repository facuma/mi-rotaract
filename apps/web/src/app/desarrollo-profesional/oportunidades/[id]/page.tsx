'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { opportunitiesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  Opportunity,
  OpportunityType,
  OpportunityModality,
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
    month: 'long',
    year: 'numeric',
  });
}

export default function OportunidadDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  const canPublish =
    user?.role === 'SECRETARY' || user?.role === 'PRESIDENT';

  const fetchOpp = useCallback(() => {
    if (!id) return;
    opportunitiesApi
      .get(id)
      .then(setOpp)
      .catch(() => setOpp(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchOpp();
  }, [fetchOpp]);

  const handlePublish = async () => {
    if (!opp?.id) return;
    try {
      await opportunitiesApi.publish(opp.id);
      toast.success('Oportunidad publicada');
      fetchOpp();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleArchive = async () => {
    if (!opp?.id) return;
    try {
      await opportunitiesApi.archive(opp.id);
      toast.success('Oportunidad archivada');
      fetchOpp();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Oportunidad no encontrada.
        <br />
        <Link href="/desarrollo-profesional/oportunidades" className="text-primary underline">
          Volver a oportunidades
        </Link>
      </div>
    );
  }

  const isActive =
    opp.status === 'PUBLISHED' &&
    (!opp.deadlineAt || new Date(opp.deadlineAt) >= new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/desarrollo-profesional/oportunidades">← Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Activa' : 'Vencida'}
            </Badge>
            <Badge variant="outline">{OPPORTUNITY_TYPE_LABEL[opp.type]}</Badge>
            <Badge variant="outline">{MODALITY_LABEL[opp.modality]}</Badge>
          </div>
          <h1 className="text-2xl font-semibold">{opp.title}</h1>
          {opp.organization && (
            <p className="text-muted-foreground">{opp.organization}</p>
          )}
          {opp.area && (
            <p className="text-sm text-muted-foreground">Área: {opp.area}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {opp.description && (
            <div>
              <h3 className="font-medium">Descripción</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {opp.description}
              </p>
            </div>
          )}
          {opp.requirements && (
            <div>
              <h3 className="font-medium">Requisitos</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {opp.requirements}
              </p>
            </div>
          )}
          {opp.deadlineAt && (
            <p className="text-sm text-muted-foreground">
              Fecha límite: {formatDate(opp.deadlineAt)}
            </p>
          )}
          {opp.externalUrl && (
            <Button asChild>
              <a
                href={opp.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver convocatoria externa
              </a>
            </Button>
          )}
          {canPublish && (
            <div className="flex gap-2 border-t pt-4">
              {opp.status === 'DRAFT' && (
                <Button onClick={handlePublish}>Publicar</Button>
              )}
              {opp.status === 'PUBLISHED' && (
                <Button variant="outline" onClick={handleArchive}>
                  Archivar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
