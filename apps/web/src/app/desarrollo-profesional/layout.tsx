'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';
import { ROTARACT_ROLES } from '@/lib/permissions';

export default function DesarrolloProfesionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedAppLayout title="Desarrollo Profesional" allowRoles={ROTARACT_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
