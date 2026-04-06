'use client';

import { useState } from 'react';
import { actaApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TOPIC_TYPE_LABELS, MAJORITY_TYPE_LABELS } from '@/lib/meeting-constants';

type ActaContent = {
  header: {
    title: string;
    date: string | null;
    startedAt: string | null;
    endedAt: string | null;
    type: string;
    quorumRequired: number | null;
    quorumMet: boolean;
    isInformationalOnly: boolean;
    club: string | null;
  };
  attendance: {
    clubs: { name: string; representative: string; isDelegate: boolean }[];
    absent: string[];
  };
  topics: {
    order: number;
    title: string;
    type: string;
    summary: string;
    vote?: {
      method: string;
      majority: string;
      yes: number;
      no: number;
      abstain: number;
      total: number;
      approved: boolean | null;
      rdrTiebreaker: boolean;
    };
  }[];
  resolutions: { number: number; text: string; approved: boolean }[];
  observations: string;
  closingNotes: string;
};

type ActaEditorProps = {
  meetingId: string;
  acta: { id: string; status: string; contentJson: string; publishedAt?: string };
  canEdit: boolean;
  onUpdated?: () => void;
};

export function ActaEditor({ meetingId, acta, canEdit, onUpdated }: ActaEditorProps) {
  const [content, setContent] = useState<ActaContent>(() => JSON.parse(acta.contentJson));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isPublished = acta.status === 'PUBLISHED';
  const editable = canEdit && !isPublished;

  function updateContent(patch: Partial<ActaContent>) {
    setContent((prev) => ({ ...prev, ...patch }));
  }

  function updateTopicSummary(index: number, summary: string) {
    setContent((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) => (i === index ? { ...t, summary } : t)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await actaApi.update(meetingId, JSON.stringify(content));
      toast.success('Acta guardada.');
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await actaApi.publish(meetingId);
      toast.success('Acta publicada.');
      setConfirmPublish(false);
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al publicar.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await actaApi.downloadPdf(meetingId);
      toast.success('Descarga iniciada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al descargar.');
    } finally {
      setDownloading(false);
    }
  }

  const h = content.header;
  const typeLabel = h.type === 'ORDINARY' ? 'Ordinaria' : 'Extraordinaria';

  return (
    <div className="space-y-6">
      {/* Status + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Acta de Reunión</h2>
          <Badge variant={isPublished ? 'success' : 'secondary'}>
            {isPublished ? 'Publicada' : 'Borrador'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {editable && (
            <>
              <Button variant="outline" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button onClick={() => setConfirmPublish(true)}>
                Publicar acta
              </Button>
            </>
          )}
          <Button variant="outline" disabled={downloading} onClick={handleDownload}>
            {downloading ? 'Descargando...' : 'Descargar PDF'}
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>{h.title}</CardTitle>
          <CardDescription>
            Reunión {typeLabel}
            {h.date && ` — ${new Date(h.date).toLocaleDateString('es-AR', { dateStyle: 'long' })}`}
            {h.club && ` — ${h.club}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          {h.startedAt && h.endedAt && (
            <p>
              Horario: {new Date(h.startedAt).toLocaleTimeString('es-AR', { timeStyle: 'short' })}
              {' — '}
              {new Date(h.endedAt).toLocaleTimeString('es-AR', { timeStyle: 'short' })}
            </p>
          )}
          <p>
            Quórum: {h.quorumMet ? 'Alcanzado' : 'No alcanzado'}
            {h.quorumRequired && ` (${h.quorumRequired} requeridos)`}
          </p>
          {h.isInformationalOnly && (
            <p className="text-warning font-medium">Reunión informativa — Sin quórum</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asistencia</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {content.attendance.clubs.length > 0 && (
            <div>
              <p className="font-medium mb-1">Clubes presentes ({content.attendance.clubs.length})</p>
              <ul className="space-y-1">
                {content.attendance.clubs.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span>• {c.name} — {c.representative}</span>
                    {c.isDelegate && <Badge variant="outline" className="text-xs">Delegado</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {content.attendance.absent.length > 0 && (
            <div>
              <p className="font-medium mb-1 text-muted-foreground">Ausentes ({content.attendance.absent.length})</p>
              <p className="text-muted-foreground">{content.attendance.absent.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orden del Día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.topics.map((topic, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{topic.order}. {topic.title}</span>
                <StatusBadge
                  status={topic.type}
                  label={TOPIC_TYPE_LABELS[topic.type] ?? topic.type}
                  size="sm"
                />
              </div>
              {topic.vote && (
                <div className="text-xs space-y-1 rounded-md bg-muted/30 p-2">
                  <p>
                    Votación {topic.vote.method === 'SECRET' ? 'Secreta' : 'Pública'}
                    {' '}({MAJORITY_TYPE_LABELS[topic.vote.majority] ?? topic.vote.majority})
                  </p>
                  <p>A favor: {topic.vote.yes} | En contra: {topic.vote.no} | Abstención: {topic.vote.abstain}</p>
                  {topic.vote.approved !== null && (
                    <Badge variant={topic.vote.approved ? 'success' : 'destructive'} className="text-xs">
                      {topic.vote.approved ? 'Aprobada' : 'Rechazada'}
                    </Badge>
                  )}
                  {topic.vote.rdrTiebreaker && (
                    <p className="text-muted-foreground">Desempate por el RDR (Art. 49)</p>
                  )}
                </div>
              )}
              {editable && (
                <Textarea
                  value={topic.summary}
                  onChange={(e) => updateTopicSummary(i, e.target.value)}
                  placeholder="Resumen de la discusión (opcional)"
                  rows={2}
                  className="text-sm"
                />
              )}
              {!editable && topic.summary && (
                <p className="text-sm text-muted-foreground">{topic.summary}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resolutions */}
      {content.resolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {content.resolutions.map((res) => (
                <li key={res.number} className="flex items-start gap-2">
                  <Badge variant="success" className="text-xs shrink-0">N° {res.number}</Badge>
                  <span>{res.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {editable ? (
            <Textarea
              value={content.observations}
              onChange={(e) => updateContent({ observations: e.target.value })}
              placeholder="Observaciones del secretario..."
              rows={4}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {content.observations || 'Sin observaciones.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Closing notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas de Cierre</CardTitle>
        </CardHeader>
        <CardContent>
          {editable ? (
            <Textarea
              value={content.closingNotes}
              onChange={(e) => updateContent({ closingNotes: e.target.value })}
              placeholder="Notas de cierre de la reunión..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {content.closingNotes || 'Sin notas.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm publish dialog */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar acta</DialogTitle>
            <DialogDescription>
              Una vez publicada, el acta no se puede editar. ¿Estás seguro?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>Cancelar</Button>
            <Button disabled={publishing} onClick={handlePublish}>
              {publishing ? 'Publicando...' : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
