'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventsApi, clubsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { EventsAdminTable } from '@/components/events/EventsAdminTable';
import { BulkImportModal } from '@/components/bulk-import';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Event, Club } from '@/lib/api';

export default function AdminEventosPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await eventsApi.list({
        page: 1,
        limit: 100,
        status: undefined,
      });
      setEvents(res.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar eventos');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    if (user?.role === 'SECRETARY' || user?.role === 'PRESIDENT') {
      clubsApi.list().then(setClubs).catch(() => setClubs([]));
    }
  }, [user?.role]);

  const handlePublish = async (e: Event) => {
    try {
      await eventsApi.publish(e.id);
      toast.success('Evento publicado');
      loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al publicar');
    }
  };

  const handleCancel = async (e: Event) => {
    if (!window.confirm(`¿Cancelar el evento "${e.title}"?`)) return;
    try {
      await eventsApi.cancel(e.id);
      toast.success('Evento cancelado');
      loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cancelar');
    }
  };

  const handleFinish = async (e: Event) => {
    try {
      await eventsApi.markFinished(e.id);
      toast.success('Evento finalizado');
      loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (e: Event) => {
    if (!window.confirm(`¿Eliminar definitivamente el evento "${e.title}"?`)) return;
    try {
      await eventsApi.delete(e.id);
      toast.success('Evento eliminado');
      loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>
            Creá y gestioná eventos del distrito y de los clubes.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Importar CSV
          </Button>
          <Button asChild>
            <Link href="/admin/eventos/nuevo">Nuevo evento</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 text-sm font-medium text-destructive">{error}</p>
        )}
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay eventos. Creá uno para comenzar.
          </p>
        ) : (
          <EventsAdminTable
            events={events}
            onPublish={handlePublish}
            onCancel={handleCancel}
            onFinish={handleFinish}
            onDelete={handleDelete}
          />
        )}
      </CardContent>
      <BulkImportModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Importar eventos"
        description="Subí un archivo CSV con la plantilla. Usá UTF-8."
        onDownloadTemplate={eventsApi.downloadBulkTemplate}
        onImport={(file, mode) => eventsApi.bulkImport(file, mode)}
        onSuccess={loadEvents}
      />
    </Card>
  );
}
