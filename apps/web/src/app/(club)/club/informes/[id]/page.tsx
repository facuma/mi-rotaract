'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clubApi, type ClubReportDetail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportStatusBadge } from '@/components/club/reports/ReportStatusBadge';
import { AttachmentsCard } from '@/components/attachments/AttachmentsCard';
import { ATTACHMENT_CONFIG } from '@/lib/attachment-config';

export default function InformeDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [report, setReport] = useState<ClubReportDetail | null>(null);
  const [error, setError] = useState('');
  const isPresident = user?.role === 'PRESIDENT' || user?.role === 'RDR';

  useEffect(() => {
    if (!id) return;
    clubApi.reports.get(id).then(setReport).catch((e) => setError(e.message));
  }, [id]);

  const handleSubmit = async () => {
    if (!report || report.status !== 'DRAFT') return;
    try {
      await clubApi.reports.submit(id);
      const updated = await clubApi.reports.get(id);
      setReport(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleResubmit = async () => {
    if (!report || (report.status !== 'OBSERVED' && report.status !== 'REJECTED')) return;
    try {
      await clubApi.reports.resubmit(id);
      const updated = await clubApi.reports.get(id);
      setReport(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  if (!report && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/club/informes">Volver</Link>
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const canEdit = report.status === 'DRAFT' || report.status === 'OBSERVED' || report.status === 'REJECTED';
  const canSubmit = report.status === 'DRAFT' && isPresident;
  const canResubmit = (report.status === 'OBSERVED' || report.status === 'REJECTED') && isPresident;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/club/informes">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              Informe {report.type} — {report.districtPeriod?.name ?? '—'}
            </CardTitle>
            <ReportStatusBadge status={report.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.observations && (
            <div>
              <h3 className="text-sm font-medium mb-1">Observaciones del distrito</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {report.observations}
              </p>
            </div>
          )}
          {canEdit && (
            <div>
              <h3 className="text-sm font-medium mb-1">Contenido</h3>
              <p className="text-sm whitespace-pre-wrap">
                {report.contentJson || '(vacío)'}
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href={`/club/informes/${id}/editar`}>Editar</Link>
              </Button>
            </div>
          )}
          {report.responseToObservations && (
            <div>
              <h3 className="text-sm font-medium mb-1">Respuesta a observaciones</h3>
              <p className="text-sm whitespace-pre-wrap">{report.responseToObservations}</p>
            </div>
          )}
          {report.submittedAt && (
            <p className="text-xs text-muted-foreground">
              Enviado: {new Date(report.submittedAt).toLocaleString()}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canSubmit && (
              <Button onClick={handleSubmit}>Enviar informe</Button>
            )}
            {canResubmit && (
              <Button onClick={handleResubmit}>Reenviar informe</Button>
            )}
          </div>
        </CardContent>
      </Card>
      {report.status === 'DRAFT' && (
        <AttachmentsCard
          fetchKey={id}
          title="Adjuntos"
          list={() => clubApi.reports.listAttachments(id)}
          upload={(file) => clubApi.reports.uploadAttachment(id, file)}
          deleteAttachment={(attachmentId) =>
            clubApi.reports.deleteAttachment(id, attachmentId)
          }
          maxFiles={ATTACHMENT_CONFIG.report.maxFiles}
          maxSizeBytes={ATTACHMENT_CONFIG.report.maxSizeMB * 1024 * 1024}
          accept={ATTACHMENT_CONFIG.report.accept}
          onChanged={() => clubApi.reports.get(id).then(setReport)}
        />
      )}
    </div>
  );
}
