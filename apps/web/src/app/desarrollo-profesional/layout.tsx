'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';

const DEV_PROF_ROLES = ['PRESIDENT', 'PARTICIPANT', 'SECRETARY'];

export default function DesarrolloProfesionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    } else if (!DEV_PROF_ROLES.includes(user.role)) {
      router.replace('/meetings');
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || !DEV_PROF_ROLES.includes(user.role)) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell title="Desarrollo Profesional" user={user}>
      {children}
    </AppShell>
  );
}
