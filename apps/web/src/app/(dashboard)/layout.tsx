'use client';

import { ProtectedAppLayout } from '@/components/auth/ProtectedAppLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAppLayout title="Mi Rotaract">
      {children}
    </ProtectedAppLayout>
  );
}
