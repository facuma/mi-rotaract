'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clubApi, type ClubProject } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { BulkImportModal } from '@/components/bulk-import';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

export default function ClubProyectosPage() {
  const [projects, setProjects] = useState<ClubProject[] | null>(null);
  const [error, setError] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  const loadProjects = () => {
    clubApi.projects.list().then(setProjects).catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  if (!projects && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/club">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Proyectos del club"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              Importar CSV
            </Button>
            <Button asChild>
              <Link href="/club/proyectos/nuevo">Nuevo proyecto</Link>
            </Button>
          </div>
        }
      />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!projects || projects.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Aún no hay proyectos"
                description="Creá el primero para tu club."
                action={
                  <Button asChild>
                    <Link href="/club/proyectos/nuevo">Crear proyecto</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>{p.category ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/club/proyectos/${p.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BulkImportModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Importar proyectos"
        description="Subí un archivo CSV con la plantilla. Usá UTF-8."
        onDownloadTemplate={clubApi.projects.downloadBulkTemplate}
        onImport={(file, mode) => clubApi.projects.bulkImport(file, mode)}
        onSuccess={loadProjects}
      />
    </div>
  );
}
