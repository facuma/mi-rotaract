'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell title="Configuración" user={user}>
      {children}
    </AppShell>
  );
}
