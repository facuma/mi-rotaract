'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { clubApi, type ClubProjectDetail } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatusBadge } from '@/components/club/projects/ProjectStatusBadge';
import { ProjectProgressTimeline } from '@/components/club/projects/ProjectProgressTimeline';
import { ProjectStatusSelect } from '@/components/club/projects/ProjectStatusSelect';
import { AttachmentsCard } from '@/components/attachments/AttachmentsCard';
import { ATTACHMENT_CONFIG } from '@/lib/attachment-config';

const TRANSITIONS: Record<string, string[]> = {
  IDEA: ['PLANIFICACION', 'CANCELADO'],
  PLANIFICACION: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
};

export default function ProyectoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<ClubProjectDetail | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    clubApi.projects.get(id).then(setProject).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleStatusChange = async (status: string) => {
    try {
      await clubApi.projects.updateStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  if (!project && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/club/proyectos">Volver</Link>
        </Button>
      </div>
    );
  }

  if (!project) return null;

  const nextStatuses = TRANSITIONS[project.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/club/proyectos">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{project.title}</CardTitle>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {nextStatuses.length > 0 && (
            <ProjectStatusSelect
              current={project.status}
              options={nextStatuses}
              onChange={handleStatusChange}
            />
          )}
          {project.assignedTo && (
            <p className="text-sm">
              Responsable: {project.assignedTo.fullName}
            </p>
          )}
          {project.startDate && (
            <p className="text-sm text-muted-foreground">
              Inicio: {new Date(project.startDate).toLocaleDateString()}
              {project.endDate &&
                ` — Fin: ${new Date(project.endDate).toLocaleDateString()}`}
            </p>
          )}
        </CardContent>
      </Card>
      <ProjectProgressTimeline
        projectId={id}
        progress={project.progress}
        onAdded={load}
      />
      <AttachmentsCard
        fetchKey={id}
        title="Evidencia / Adjuntos"
        list={() => clubApi.projects.listAttachments(id)}
        upload={(file) => clubApi.projects.uploadAttachment(id, file)}
        deleteAttachment={(attachmentId) =>
          clubApi.projects.deleteAttachment(id, attachmentId)
        }
        maxFiles={ATTACHMENT_CONFIG.project.maxFiles}
        maxSizeBytes={ATTACHMENT_CONFIG.project.maxSizeMB * 1024 * 1024}
        accept={ATTACHMENT_CONFIG.project.accept}
        onChanged={load}
      />
    </div>
  );
}
