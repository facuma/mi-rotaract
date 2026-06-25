'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthState } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DISTRICT_ROLES } from '@/lib/permissions';

const LINKS = [
  { href: '/admin/district/informes', label: 'Informes' },
  { href: '/admin/district/clubes', label: 'Clubes' },
  { href: '/admin/district/comites', label: 'Comités' },
];

export default function DistrictLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !DISTRICT_ROLES.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !DISTRICT_ROLES.includes(user.role)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 border-b pb-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === link.href || pathname.startsWith(link.href + '/')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
