'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClubMe } from '@/lib/api';

type UpdatePayload = Parameters<
  (typeof import('@/lib/api').clubApi)['updateMe']
>[0];

export function ClubEditableFields({
  club,
  onUpdate,
}: {
  club: ClubMe;
  onUpdate: (data: UpdatePayload) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<UpdatePayload>({
    logoUrl: club.logoUrl ?? undefined,
    city: club.city ?? undefined,
    zone: club.zone ?? undefined,
    foundedAt: club.foundedAt
      ? new Date(club.foundedAt).toISOString().slice(0, 10)
      : undefined,
    description: club.description ?? undefined,
    contactEmail: club.contactEmail ?? undefined,
    contactPhone: club.contactPhone ?? undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate(form);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Editar datos del club</CardTitle>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </CardHeader>
      {editing && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="logoUrl">URL del logo</Label>
              <Input
                id="logoUrl"
                type="url"
                value={form.logoUrl ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, logoUrl: e.target.value || undefined }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={form.city ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value || undefined }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="zone">Zona</Label>
                <Input
                  id="zone"
                  value={form.zone ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, zone: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="foundedAt">Fecha de fundación</Label>
              <Input
                id="foundedAt"
                type="date"
                value={form.foundedAt ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    foundedAt: e.target.value || undefined,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción institucional</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value || undefined,
                  }))
                }
                placeholder="Breve descripción del club..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contactEmail">Email de contacto</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contactEmail: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Teléfono de contacto</Label>
                <Input
                  id="contactPhone"
                  value={form.contactPhone ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contactPhone: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
