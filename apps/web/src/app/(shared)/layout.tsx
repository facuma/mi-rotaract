'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <AppShellSkeleton />;
  }

  const backHref =
    user.role === 'SECRETARY' || user.role === 'PRESIDENT' ? '/admin/meetings' : '/meetings';

  return (
    <AppShell title="Historial" user={user} backHref={backHref} backLabel="Volver">
      {children}
    </AppShell>
  );
}
