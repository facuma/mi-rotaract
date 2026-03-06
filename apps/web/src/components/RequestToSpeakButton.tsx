'use client';

import { useState } from 'react';
import { queueApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  async function handleClick() {
    setLoading(true);
    try {
      await queueApi.request(meetingId);
      toast.success('Pedido de palabra enviado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al pedir palabra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      size="lg"
      className={className}
    >
      {loading ? 'Enviando...' : 'Pedir palabra'}
    </Button>
  );
}
