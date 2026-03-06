'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type AuthChoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthChoiceModal({ isOpen, onClose }: AuthChoiceModalProps) {
  const router = useRouter();

  const goToLogin = () => {
    onClose();
    router.push('/login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle id="auth-modal-title">Acceder a Mi Rotaract</DialogTitle>
          <DialogDescription>
            Inicia sesión con las credenciales que te haya proporcionado tu distrito.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={goToLogin} className="w-full">
            Iniciar sesión con email
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
