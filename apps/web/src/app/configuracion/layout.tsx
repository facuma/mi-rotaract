'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Configuración">
      {children}
    </ProtectedAppLayout>
  );
}
