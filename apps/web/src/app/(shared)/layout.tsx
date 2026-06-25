'use client';

import { useAuthState } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';
import { ADMIN_ROLES, ROTARACT_ROLES } from '@/lib/permissions';
import type { Role } from '@/types/auth';

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!ROTARACT_ROLES.includes(user.role as Role)) {
      router.replace('/talento');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !ROTARACT_ROLES.includes((user?.role ?? '') as Role)) {
    return <AppShellSkeleton />;
  }

  const backHref = ADMIN_ROLES.includes(user.role as Role) ? '/admin/meetings' : '/meetings';

  return (
    <AppShell title="Historial" user={user} backHref={backHref} backLabel="Volver">
      {children}
    </AppShell>
  );
}
