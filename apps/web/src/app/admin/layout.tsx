'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';

const ADMIN_ROLES = ['SECRETARY', 'PRESIDENT', 'RDR'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Mi Rotaract — Administración" allowRoles={ADMIN_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
