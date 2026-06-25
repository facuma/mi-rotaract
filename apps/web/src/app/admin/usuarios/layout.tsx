'use client';

import { useAuthState } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsuariosAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'SUPERADMIN') return null;

  return <>{children}</>;
}
