'use client';

import { useState } from 'react';
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

type CreateClubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    code: string;
    presidentEmail?: string;
    enabledForDistrictMeetings: boolean;
    cuotaAldia: boolean;
    informeAlDia: boolean;
  }) => Promise<void>;
};

export function CreateClubModal({ isOpen, onClose, onCreate }: CreateClubModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [presidentEmail, setPresidentEmail] = useState('');
  const [enabledForDistrictMeetings, setEnabledForDistrictMeetings] = useState(true);
  const [cuotaAldia, setCuotaAldia] = useState(false);
  const [informeAlDia, setInformeAlDia] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onCreate({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        presidentEmail: presidentEmail.trim() || undefined,
        enabledForDistrictMeetings,
        cuotaAldia,
        informeAlDia,
      });
      setName('');
      setCode('');
      setPresidentEmail('');
      setEnabledForDistrictMeetings(true);
      setCuotaAldia(false);
      setInformeAlDia(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear club');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo club</DialogTitle>
          <DialogDescription>
            Crear un club. El email del presidente permitirá auto-aceptarlo cuando se registre.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Club Rotaract Alpha"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="Ej: CLUB-ALPHA"
              className="font-mono"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presidentEmail">Email del presidente</Label>
            <Input
              id="presidentEmail"
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
              id="enabledForDistrictMeetings"
              checked={enabledForDistrictMeetings}
              onChange={(e) => setEnabledForDistrictMeetings(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="enabledForDistrictMeetings">
              Participa en reuniones distritales
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cuotaAldia"
              checked={cuotaAldia}
              onChange={(e) => setCuotaAldia(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="cuotaAldia">Cuota al día</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="informeAlDia"
              checked={informeAlDia}
              onChange={(e) => setInformeAlDia(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="informeAlDia">Informe al día</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
