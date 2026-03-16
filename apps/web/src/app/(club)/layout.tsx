'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';

/** Roles que pueden acceder a Mi Club (cualquier miembro del club, incl. usuario común) */
const CLUB_ROLES = ['PRESIDENT', 'PARTICIPANT', 'SECRETARY'];

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!CLUB_ROLES.includes(user.role)) {
      router.replace('/meetings');
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || !CLUB_ROLES.includes(user.role)) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell title="Mi Rotaract — Mi Club" user={user}>
      {children}
    </AppShell>
  );
}
