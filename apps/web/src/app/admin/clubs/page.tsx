'use client';

import { useEffect, useState } from 'react';
import { clubsApi, type Club } from '@/lib/api';
import { ClubsTable } from '@/components/ClubsTable';
import { BulkImportModal } from '@/components/bulk-import';
import { CreateClubModal } from '@/components/clubs/CreateClubModal';
import { EditClubModal } from '@/components/clubs/EditClubModal';
import { ConfirmDeleteClubModal } from '@/components/clubs/ConfirmDeleteClubModal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  const loadClubs = () => {
    setLoading(true);
    clubsApi
      .list(true)
      .then(setClubs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreate = async (data: Parameters<typeof clubsApi.create>[0]) => {
    await clubsApi.create(data);
    loadClubs();
  };

  const handleSave = async (
    id: string,
    data: Parameters<typeof clubsApi.update>[1],
  ) => {
    await clubsApi.update(id, data);
    loadClubs();
    setEditingClub(null);
  };

  const activeClubs = clubs.filter((club) => club.status === 'ACTIVE');
  const inactiveClubs = clubs.filter((club) => club.status !== 'ACTIVE');

  const handleRequestDelete = (club: Club) => {
    setDeleteError('');
    setClubToDelete(club);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clubToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await clubsApi.delete(clubToDelete.id);
      setDeleteModalOpen(false);
      setClubToDelete(null);
      loadClubs();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'No se pudo eliminar el club. Verificá que no tenga datos asociados.';
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (club: Club) => {
    setEditingClub(club);
    setEditModalOpen(true);
  };

  const closeEdit = () => {
    setEditModalOpen(false);
    setEditingClub(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <Skeleton className="mb-2 h-7 w-32" />
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
          <p className="text-sm font-medium text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Clubes</CardTitle>
            <CardDescription>
              Gestioná los clubes del distrito, presidentes y participación en
              reuniones.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border bg-surface-0 p-1">
              <Button
                type="button"
                variant={activeTab === 'active' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setActiveTab('active')}
              >
                Activos
              </Button>
              <Button
                type="button"
                variant={activeTab === 'inactive' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setActiveTab('inactive')}
              >
                Desactivados
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkModalOpen(true)}>
                Importar CSV
              </Button>
              <Button onClick={() => setCreateModalOpen(true)}>Nuevo club</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClubsTable
            clubs={activeTab === 'active' ? activeClubs : inactiveClubs}
            onEdit={openEdit}
            onDelete={handleRequestDelete}
          />
        </CardContent>
      </Card>

      <CreateClubModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />

      <EditClubModal
        club={editingClub}
        isOpen={editModalOpen}
        onClose={closeEdit}
        onSave={handleSave}
      />

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Importar clubes"
        description="Subí un archivo CSV con la plantilla. Usá UTF-8 para caracteres especiales."
        onDownloadTemplate={clubsApi.downloadBulkTemplate}
        onImport={(file, mode) => clubsApi.bulkImport(file, mode)}
        onSuccess={loadClubs}
      />

      <ConfirmDeleteClubModal
        club={clubToDelete}
        isOpen={deleteModalOpen}
        loading={deleteLoading}
        error={deleteError}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteModalOpen(false);
          setClubToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
