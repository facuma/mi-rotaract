'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';
import { ADMIN_ROLES } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Mi Rotaract — Administración" allowRoles={ADMIN_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
