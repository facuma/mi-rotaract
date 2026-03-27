'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Mi perfil">
      {children}
    </ProtectedAppLayout>
  );
}
