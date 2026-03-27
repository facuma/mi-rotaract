'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/lib/api';
import { queryKeys, useMeetingsQuery } from '@/lib/queries';
import { MeetingsTable } from '@/components/MeetingsTable';
import { BulkImportModal } from '@/components/bulk-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  club?: { name: string };
};

export default function AdminMeetingsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useMeetingsQuery();
  const meetings = (data ?? []) as Meeting[];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive font-medium">
            {error instanceof Error ? error.message : 'No se pudieron cargar reuniones.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Reuniones</CardTitle>
          <CardDescription>
            Gestioná las reuniones distritales y su agenda.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Importar CSV
          </Button>
          <Button asChild>
            <Link href="/admin/meetings/new">Nueva reunión</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <MeetingsTable meetings={meetings} />
      </CardContent>
      <BulkImportModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Importar reuniones"
        description="Subí un archivo CSV con la plantilla. Usá UTF-8."
        onDownloadTemplate={meetingsApi.downloadBulkTemplate}
        onImport={(file, mode) => meetingsApi.bulkImport(file, mode)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.meetings })}
      />
    </Card>
  );
}
