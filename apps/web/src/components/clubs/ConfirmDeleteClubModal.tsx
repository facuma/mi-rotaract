'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Club } from '@/lib/api';

type ConfirmDeleteClubModalProps = {
  club: Club | null;
  isOpen: boolean;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteClubModal({
  club,
  isOpen,
  loading = false,
  error,
  onClose,
  onConfirm,
}: ConfirmDeleteClubModalProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !loading) onClose();
  };

  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desactivar club</DialogTitle>
          <DialogDescription>
            Estás por desactivar el club <span className="font-semibold">{club.name}</span>.{' '}
            No se podrá usar para nuevas reuniones ni operaciones, pero se conservará el historial
            de reuniones, eventos, informes y proyectos asociados para consulta.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Desactivando...' : 'Desactivar club'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

