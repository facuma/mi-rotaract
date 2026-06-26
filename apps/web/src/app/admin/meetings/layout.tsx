'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/context/AuthContext';
import { DISTRICT_ROLES, getDefaultRouteForRole } from '@/lib/permissions';
import { AppShellSkeleton } from '@/components/layout/AppShell';
import type { Role } from '@/types/auth';

export default function MeetingsAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !DISTRICT_ROLES.includes(user.role as Role)) {
      router.replace(user ? getDefaultRouteForRole(user.role as Role) : '/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !DISTRICT_ROLES.includes(user.role as Role)) {
    return <AppShellSkeleton />;
  }

  return <>{children}</>;
}
