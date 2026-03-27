'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell, AppShellSkeleton } from '@/components/layout/AppShell';
import { useAuthState } from '@/context/AuthContext';

type ProtectedAppLayoutProps = {
  title: string;
  allowRoles?: string[];
  fallbackHref?: string;
  children: ReactNode;
};

export function ProtectedAppLayout({
  title,
  allowRoles,
  fallbackHref = '/meetings',
  children,
}: ProtectedAppLayoutProps) {
  const { user, isLoading } = useAuthState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.prefetch('/login');
    router.prefetch('/meetings');
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowRoles && !allowRoles.includes(user.role)) {
      router.replace(fallbackHref);
    }
  }, [user, isLoading, router, pathname, allowRoles, fallbackHref]);

  const userAllowed = !allowRoles || (user ? allowRoles.includes(user.role) : false);
  if (isLoading || !user || !userAllowed) {
    return <AppShellSkeleton />;
  }

  return <AppShell title={title} user={user}>{children}</AppShell>;
}
