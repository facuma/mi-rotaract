'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';

const DEV_PROF_ROLES = ['PRESIDENT', 'RDR', 'PARTICIPANT', 'SECRETARY'];

export default function DesarrolloProfesionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedAppLayout title="Desarrollo Profesional" allowRoles={DEV_PROF_ROLES}>
      {children}
    </ProtectedAppLayout>
  );
}
