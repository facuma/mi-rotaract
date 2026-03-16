'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { meetingsApi, topicsApi } from '@/lib/api';
import { MeetingHeader } from '@/components/MeetingHeader';
import { AttachmentsCard } from '@/components/attachments/AttachmentsCard';
import { ATTACHMENT_CONFIG } from '@/lib/attachment-config';
import { TopicListSortable } from '@/components/TopicListSortable';
import { BulkImportModal } from '@/components/bulk-import';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  currentTopicId?: string | null;
  club?: { name: string };
  participants?: { userId: string; canVote: boolean; user?: { fullName: string } }[];
};

type Topic = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  type: string;
  estimatedDurationSec?: number | null;
  status: string;
};

export default function MeetingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicType, setNewTopicType] = useState('DISCUSSION');
  const [bulkParticipantsOpen, setBulkParticipantsOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([meetingsApi.get(id), topicsApi.list(id)])
      .then(([m, t]) => {
        setMeeting(m as Meeting);
        setTopics(t as Topic[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function refreshMeeting() {
    if (!id) return;
    const m = await meetingsApi.get(id);
    setMeeting(m as Meeting);
  }

  async function doAction(fn: () => Promise<unknown>) {
    setError('');
    setActioning(true);
    try {
      const updated = await fn();
      setMeeting(updated as Meeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setActioning(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!meeting) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <MeetingHeader
            title={meeting.title}
            status={meeting.status}
            scheduledAt={meeting.scheduledAt}
            club={meeting.club}
            actions={
              <div className="flex flex-wrap gap-2">
                {meeting.status === 'DRAFT' && (
                  <Button
                    disabled={actioning}
                    onClick={() => doAction(() => meetingsApi.schedule(id))}
                  >
                    Programar reunión
                  </Button>
                )}
                {(meeting.status === 'DRAFT' || meeting.status === 'SCHEDULED') && (
                  <Button
                    disabled={actioning}
                    onClick={() => doAction(() => meetingsApi.start(id))}
                  >
                    Iniciar reunión
                  </Button>
                )}
                {meeting.status === 'LIVE' && (
                  <Button
                    variant="secondary"
                    disabled={actioning}
                    onClick={() => doAction(() => meetingsApi.pause(id))}
                  >
                    Pausar
                  </Button>
                )}
                {meeting.status === 'PAUSED' && (
                  <Button
                    disabled={actioning}
                    onClick={() => doAction(() => meetingsApi.resume(id))}
                  >
                    Reanudar
                  </Button>
                )}
                {(meeting.status === 'LIVE' || meeting.status === 'PAUSED') && (
                  <Button
                    variant="destructive"
                    size="lg"
                    disabled={actioning}
                    onClick={() => {
                      if (window.confirm('¿Finalizar la reunión? Esta acción no se puede deshacer.')) {
                        doAction(() => meetingsApi.finish(id));
                      }
                    }}
                  >
                    Finalizar reunión
                  </Button>
                )}
                {(meeting.status === 'LIVE' || meeting.status === 'PAUSED') && (
                  <Button asChild>
                    <Link href={`/admin/meetings/${id}/live`}>Ir a sala en vivo</Link>
                  </Button>
                )}
              </div>
            }
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
          {meeting.description && (
            <p className="text-sm text-muted-foreground">{meeting.description}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Temas de agenda</CardTitle>
          <CardDescription>Ordená los temas y marcá el actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TopicListSortable
            meetingId={id}
            topics={topics}
            currentTopicId={meeting.currentTopicId}
            canEdit
            onTopicsChange={setTopics}
            onCurrentTopicChange={refreshMeeting}
          />
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newTopicTitle.trim()) return;
              setError('');
              try {
                const t = (await topicsApi.create(id, {
                  title: newTopicTitle.trim(),
                  type: newTopicType,
                })) as Topic;
                setTopics((prev) => [...prev, t].sort((a, b) => a.order - b.order));
                setNewTopicTitle('');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Error');
              }
            }}
          >
            <Input
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Título del tema"
              className="min-w-[200px]"
            />
            <Select value={newTopicType} onValueChange={setNewTopicType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCUSSION">Discusión</SelectItem>
                <SelectItem value="VOTING">Votación</SelectItem>
                <SelectItem value="INFORMATIVE">Informativo</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Agregar tema</Button>
          </form>
        </CardContent>
      </Card>

      {meeting.status === 'DRAFT' && (
        <AttachmentsCard
          fetchKey={id}
          title="Actas / Documentos"
          list={() => meetingsApi.listAttachments(id)}
          upload={(file) => meetingsApi.uploadAttachment(id, file)}
          deleteAttachment={(attachmentId) =>
            meetingsApi.deleteAttachment(id, attachmentId)
          }
          maxFiles={ATTACHMENT_CONFIG.meeting.maxFiles}
          maxSizeBytes={ATTACHMENT_CONFIG.meeting.maxSizeMB * 1024 * 1024}
          accept={ATTACHMENT_CONFIG.meeting.accept}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Participantes</CardTitle>
            <CardDescription>Asignados a esta reunión.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setBulkParticipantsOpen(true)}>
            Importar CSV
          </Button>
        </CardHeader>
        <CardContent>
          {meeting.participants?.length ? (
            <ul className="space-y-1 text-sm">
              {meeting.participants.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  {p.user?.fullName ?? p.userId}
                  {p.canVote && (
                    <Badge variant="outline" className="text-xs">vota</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin participantes asignados.</p>
          )}

          <BulkImportModal
            isOpen={bulkParticipantsOpen}
            onClose={() => setBulkParticipantsOpen(false)}
            title="Importar participantes"
            description="Subí un archivo CSV con emails de usuarios existentes. Usá UTF-8."
            onDownloadTemplate={() => meetingsApi.downloadParticipantsBulkTemplate(id)}
            onImport={(file, mode) => meetingsApi.bulkImportParticipants(id, file, mode)}
            onSuccess={refreshMeeting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
