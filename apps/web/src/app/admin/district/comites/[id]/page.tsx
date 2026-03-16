'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { districtApi, usersApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AttachmentsCard } from '@/components/attachments/AttachmentsCard';
import { BulkImportModal } from '@/components/bulk-import';
import { ATTACHMENT_CONFIG } from '@/lib/attachment-config';

type Committee = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coordinator: { id: string; fullName: string; email: string };
  districtPeriod?: { id: string; name: string } | null;
  members: { id: string; userId: string; role: string | null; user: { id: string; fullName: string; email: string } }[];
  objectives: { id: string; title: string; description: string | null; order: number }[];
  activities: { id: string; title: string; date: string; notes: string | null }[];
};

type User = { id: string; fullName: string; email: string };

export default function DistrictComiteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDate, setNewActivityDate] = useState('');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkMembersOpen, setBulkMembersOpen] = useState(false);

  const load = () => {
    districtApi.committees.get(id).then(setCommittee as (c: unknown) => void).catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (!id) return;
    load();
    usersApi.list().then((u) => setUsers(u as User[])).catch(() => {});
  }, [id]);

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveTitle.trim()) return;
    setSaving(true);
    districtApi.committees
      .createObjective(id, { title: newObjectiveTitle.trim() })
      .then(() => {
        setNewObjectiveTitle('');
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim() || !newActivityDate) return;
    setSaving(true);
    districtApi.committees
      .createActivity(id, {
        title: newActivityTitle.trim(),
        date: newActivityDate,
        notes: newActivityNotes.trim() || undefined,
      })
      .then(() => {
        setNewActivityTitle('');
        setNewActivityDate('');
        setNewActivityNotes('');
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUserId) return;
    setSaving(true);
    districtApi.committees
      .addMember(id, { userId: newMemberUserId })
      .then(() => {
        setNewMemberUserId('');
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('¿Quitar a este integrante del comité?')) return;
    setSaving(true);
    districtApi.committees
      .removeMember(id, userId)
      .then(load)
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    districtApi.committees
      .update(id, { status: newStatus })
      .then(load)
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
  };

  if (!committee && !error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !committee) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/district/comites">Volver</Link>
        </Button>
      </div>
    );
  }

  if (!committee) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/district/comites">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{committee.name}</CardTitle>
            <CardDescription>
              Coordinador: {committee.coordinator.fullName} · Estado: {committee.status}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={committee.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={saving}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {committee.description && (
            <p className="text-sm text-muted-foreground">{committee.description}</p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Integrantes</h3>
              <Button variant="outline" size="sm" onClick={() => setBulkMembersOpen(true)}>
                Importar CSV
              </Button>
            </div>
            <ul className="text-sm space-y-1 mb-2">
              <li>Coordinador: {committee.coordinator.fullName}</li>
              {committee.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{m.user.fullName} {m.role ? `(${m.role})` : ''}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemoveMember(m.userId)}
                    disabled={saving}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddMember} className="flex gap-2 flex-wrap items-end">
              <select
                className="rounded-md border px-2 py-1 text-sm min-w-[180px]"
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
              >
                <option value="">Agregar integrante</option>
                {users
                  .filter((u) => u.id !== committee.coordinator.id && !committee.members.some((m) => m.userId === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
              </select>
              <Button type="submit" size="sm" disabled={saving || !newMemberUserId}>Agregar</Button>
            </form>

            <BulkImportModal
              isOpen={bulkMembersOpen}
              onClose={() => setBulkMembersOpen(false)}
              title="Importar integrantes del comité"
              description="Subí un archivo CSV con emails de usuarios existentes. Usá UTF-8."
              onDownloadTemplate={() => districtApi.committees.downloadMembersBulkTemplate(id)}
              onImport={(file, mode) => districtApi.committees.bulkImportMembers(id, file, mode)}
              onSuccess={load}
            />
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Objetivos del período</h3>
            <ul className="text-sm space-y-1 mb-2">
              {committee.objectives.map((o) => (
                <li key={o.id}>· {o.title} {o.description ? `— ${o.description}` : ''}</li>
              ))}
            </ul>
            <form onSubmit={handleAddObjective} className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-md border px-2 py-1 text-sm"
                placeholder="Nuevo objetivo"
                value={newObjectiveTitle}
                onChange={(e) => setNewObjectiveTitle(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={saving || !newObjectiveTitle.trim()}>Agregar</Button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Actividades</h3>
            <ul className="text-sm space-y-4 mb-2">
              {committee.activities.map((a) => (
                <li key={a.id} className="space-y-2">
                  <div>
                    · {a.title} — {new Date(a.date).toLocaleDateString()}{' '}
                    {a.notes ? `(${a.notes})` : ''}
                  </div>
                  <AttachmentsCard
                    fetchKey={a.id}
                    title="Evidencias"
                    list={() =>
                      districtApi.committees.listActivityAttachments(id, a.id)
                    }
                    upload={(file) =>
                      districtApi.committees.uploadActivityAttachment(id, a.id, file)
                    }
                    deleteAttachment={(attachmentId) =>
                      districtApi.committees.deleteActivityAttachment(
                        id,
                        a.id,
                        attachmentId,
                      )
                    }
                    maxFiles={ATTACHMENT_CONFIG.committee_activity.maxFiles}
                    maxSizeBytes={
                      ATTACHMENT_CONFIG.committee_activity.maxSizeMB * 1024 * 1024
                    }
                    accept={ATTACHMENT_CONFIG.committee_activity.accept}
                  />
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddActivity} className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  className="min-w-[160px] rounded-md border px-2 py-1 text-sm"
                  placeholder="Título"
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-md border px-2 py-1 text-sm"
                  value={newActivityDate}
                  onChange={(e) => setNewActivityDate(e.target.value)}
                />
              </div>
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-sm"
                placeholder="Notas (opcional)"
                value={newActivityNotes}
                onChange={(e) => setNewActivityNotes(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={saving || !newActivityTitle.trim() || !newActivityDate}>
                Agregar actividad
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
