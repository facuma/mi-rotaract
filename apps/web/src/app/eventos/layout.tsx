'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';
import { ROTARACT_ROLES } from '@/lib/permissions';

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Eventos" allowRoles={ROTARACT_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
