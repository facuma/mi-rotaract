'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { historyApi } from '@/lib/api';
import { AuditSidebar } from '@/components/AuditSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ADMIN_ROLES = ['SECRETARY', 'PRESIDENT'];

type VoteSession = {
  id: string;
  topicId: string;
  topicTitle?: string;
  status: string;
  openedAt: string;
  closedAt?: string;
};

export default function HistoryMeetingPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<{ title: string } | null>(null);
  const [voteSessions, setVoteSessions] = useState<VoteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      try {
        const m = await historyApi.meeting(id);
        setMeeting(m as { title: string } | null);
        if (ADMIN_ROLES.includes(user.role)) {
          try {
            const vs = await historyApi.voteSessions(id);
            setVoteSessions(vs as VoteSession[]);
          } catch {
            setVoteSessions([]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      await historyApi.downloadCsv(id);
      toast.success('Descarga iniciada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al exportar.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
        <AuditSidebar meetingId={id} />
      </div>
    );
  }

  if (!meeting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{meeting.title}</CardTitle>
            <CardDescription>Detalle y auditoría de la reunión.</CardDescription>
          </CardHeader>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Votaciones</CardTitle>
              <CardDescription>Sesiones de votación de esta reunión.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {voteSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin votaciones.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {voteSessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
                    >
                      <span>{s.topicTitle ?? s.topicId}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(s.openedAt).toLocaleString('es-AR')} — {s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="lg"
                disabled={exporting || voteSessions.length === 0}
                onClick={handleExportCsv}
              >
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <AuditSidebar meetingId={id} />
    </div>
  );
}
