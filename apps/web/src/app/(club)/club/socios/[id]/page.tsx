'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { clubApi, type ClubMemberDetail } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberStatusBadge } from '@/components/club/members/MemberStatusBadge';
import { EditMemberModal } from '@/components/club/members/EditMemberModal';
import { AvatarUpload } from '@/components/AvatarUpload';

export default function ClubSocioDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [member, setMember] = useState<ClubMemberDetail | null>(null);
  const [history, setHistory] = useState<{ action: string; createdAt: string; metadataJson?: string }[] | null>(null);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    clubApi.members
      .get(id)
      .then(setMember)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    clubApi.members
      .getHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [id]);

  const handleUpdated = () => {
    setEditOpen(false);
    clubApi.members.get(id).then(setMember).catch(() => {});
  };

  const handleAssignPresident = async () => {
    if (!confirm('¿Asignar a este socio como presidente del club?')) return;
    try {
      await clubApi.members.assignPresident(id);
      clubApi.members.get(id).then(setMember).catch(() => {});
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const formatDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString('es-AR') : '—';

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/club/socios">Volver</Link>
        </Button>
      </div>
    );
  }

  if (!member) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/club/socios">← Volver al listado</Link>
          </Button>
          <h1 className="text-xl font-semibold mt-2">
            {member.firstName} {member.lastName}
            {member.isPresident && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">(Presidente)</span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          {!member.isPresident && (
            <Button variant="outline" onClick={handleAssignPresident}>
              Asignar presidente
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del socio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.user ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Foto</p>
              <AvatarUpload
                userId={member.user.id}
                displayName={`${member.firstName} ${member.lastName}`}
                onUpload={async (file) => {
                  await clubApi.members.uploadAvatar(id, file);
                }}
                canEdit
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              El socio no tiene cuenta vinculada. Vincula una cuenta para poder agregar foto.
            </p>
          )}
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>{' '}
              <a href={`mailto:${member.email}`} className="underline">
                {member.email}
              </a>
            </div>
            {member.phone && (
              <div>
                <span className="text-muted-foreground">Teléfono:</span> {member.phone}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Estado:</span>{' '}
              <MemberStatusBadge status={member.status} />
            </div>
            {member.title && (
              <div>
                <span className="text-muted-foreground">Cargo:</span> {member.title}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Fecha de ingreso:</span>{' '}
              {formatDate(member.joinedAt)}
            </div>
            {member.birthDate && (
              <div>
                <span className="text-muted-foreground">Fecha de nacimiento:</span>{' '}
                {formatDate(member.birthDate)}
              </div>
            )}
            {member.user && (
              <div>
                <span className="text-muted-foreground">Vinculado a plataforma:</span> Sí (
                {member.user.fullName})
              </div>
            )}
            {member.internalNotes && (
              <div>
                <span className="text-muted-foreground">Observaciones internas:</span>
                <p className="mt-1 p-2 bg-muted rounded text-sm">{member.internalNotes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span>{h.action}</span>
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString('es-AR')}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <EditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={member}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
