'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { districtApi, usersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type User = { id: string; fullName: string; email: string; role: string };

export default function DistrictComiteNuevoPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi.list().then(setUsers as (u: unknown) => void).catch(() => setUsers([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coordinatorId) {
      setError('Nombre y coordinador son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    districtApi.committees
      .create({
        name: name.trim(),
        description: description.trim() || undefined,
        coordinatorId,
        status,
      })
      .then((c) => {
        router.push(`/admin/district/comites/${(c as { id: string }).id}`);
      })
      .catch((e) => {
        setError(e.message);
        setSaving(false);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/district/comites">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo comité</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <label className="text-sm font-medium block mb-1">Nombre *</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Descripción</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Coordinador *</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                required
              >
                <option value="">Seleccionar</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Estado</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>Crear comité</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/district/comites">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
