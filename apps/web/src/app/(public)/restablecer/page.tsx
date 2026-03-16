'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            El enlace de restablecimiento no es válido. Solicitá uno nuevo.
          </p>
          <Link
            href="/recuperar-contrasena"
            className="text-primary underline hover:no-underline"
          >
            Recuperar contraseña
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ResetPasswordForm token={token} />
    </div>
  );
}
