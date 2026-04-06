'use client';

import { useState } from 'react';
import { queueApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type RequestToSpeakButtonProps = {
  meetingId: string;
  disabled?: boolean;
  className?: string;
};

export function RequestToSpeakButton({
  meetingId,
  disabled,
  className,
}: RequestToSpeakButtonProps) {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await queueApi.request(meetingId);
      setRequested(true);
      toast.success('Pedido de palabra enviado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al pedir palabra.');
    } finally {
      setLoading(false);
    }
  }

  if (requested) {
    return (
      <Button
        variant="secondary"
        size="lg"
        disabled
        className={cn('w-full', className)}
        aria-label="Pedido de palabra enviado"
      >
        ✓ Pedido enviado
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      size="lg"
      className={cn('w-full', className)}
      aria-label="Pedir la palabra"
    >
      {loading ? 'Enviando...' : '✋ Pedir palabra'}
    </Button>
  );
}
