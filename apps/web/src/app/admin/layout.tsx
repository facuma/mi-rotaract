'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';

const ADMIN_ROLES = ['SECRETARY', 'PRESIDENT'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      router.replace('/meetings');
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || !ADMIN_ROLES.includes(user.role)) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell title="Mi Rotaract — Administración" user={user}>
      {children}
    </AppShell>
  );
}
