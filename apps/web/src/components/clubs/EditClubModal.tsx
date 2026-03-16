'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Club } from '@/lib/api';

type EditClubModalProps = {
  club: Club | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    data: {
      name?: string;
      code?: string;
      presidentEmail?: string;
      enabledForDistrictMeetings?: boolean;
      cuotaAldia?: boolean;
      informeAlDia?: boolean;
    },
  ) => Promise<void>;
};

export function EditClubModal({ club, isOpen, onClose, onSave }: EditClubModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [presidentEmail, setPresidentEmail] = useState('');
  const [enabledForDistrictMeetings, setEnabledForDistrictMeetings] = useState(true);
  const [cuotaAldia, setCuotaAldia] = useState(false);
  const [informeAlDia, setInformeAlDia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (club) {
      setName(club.name);
      setCode(club.code);
      setPresidentEmail(club.presidentEmail ?? '');
      setEnabledForDistrictMeetings(club.enabledForDistrictMeetings);
      setCuotaAldia(club.cuotaAldia);
      setInformeAlDia(club.informeAlDia);
    }
  }, [club]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;
    setError('');
    setLoading(true);
    try {
      await onSave(club.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        presidentEmail: presidentEmail.trim() || undefined,
        enabledForDistrictMeetings,
        cuotaAldia,
        informeAlDia,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar club</DialogTitle>
          <DialogDescription>
            Modificar los datos del club {club.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Club Rotaract Alpha"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-code">Código *</Label>
            <Input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="Ej: CLUB-ALPHA"
              className="font-mono"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-presidentEmail">Email del presidente</Label>
            <Input
              id="edit-presidentEmail"
              type="email"
              value={presidentEmail}
              onChange={(e) => setPresidentEmail(e.target.value)}
              placeholder="presidente@club.org"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-enabledForDistrictMeetings"
              checked={enabledForDistrictMeetings}
              onChange={(e) => setEnabledForDistrictMeetings(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-enabledForDistrictMeetings">
              Participa en reuniones distritales
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-cuotaAldia"
              checked={cuotaAldia}
              onChange={(e) => setCuotaAldia(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-cuotaAldia">Cuota al día</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-informeAlDia"
              checked={informeAlDia}
              onChange={(e) => setInformeAlDia(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-informeAlDia">Informe al día</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
