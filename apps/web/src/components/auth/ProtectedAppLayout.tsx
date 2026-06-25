'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';
import { useAuthState } from '@/context/AuthContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import type { Role } from '@/types/auth';

type ProtectedAppLayoutProps = {
  title: string;
  allowRoles?: string[];
  /** Ruta de fallback para usuarios autenticados sin rol permitido.
   *  Si no se especifica, se usa getDefaultRouteForRole según el rol del usuario. */
  fallbackHref?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

export function ProtectedAppLayout({
  title,
  allowRoles,
  fallbackHref,
  backHref,
  backLabel,
  children,
}: ProtectedAppLayoutProps) {
  const { user, isLoading } = useAuthState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.prefetch('/login');
    router.prefetch('/dashboard');
    router.prefetch('/talento');
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowRoles && !allowRoles.includes(user.role)) {
      router.replace(fallbackHref ?? getDefaultRouteForRole(user.role as Role));
    }
  }, [user, isLoading, router, pathname, allowRoles, fallbackHref]);

  const userAllowed = !allowRoles || (user ? allowRoles.includes(user.role) : false);
  if (isLoading || !user || !userAllowed) {
    return <AppShellSkeleton />;
  }

  return (
    <AppShell title={title} user={user} backHref={backHref} backLabel={backLabel}>
      {children}
    </AppShell>
  );
}
