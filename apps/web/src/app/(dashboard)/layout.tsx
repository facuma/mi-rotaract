'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';
import { ROTARACT_ROLES } from '@/lib/permissions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Mi Rotaract" allowRoles={ROTARACT_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
