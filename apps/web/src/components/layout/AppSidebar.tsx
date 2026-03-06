'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavItemsForRole } from '@/lib/nav-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AppSidebarProps = {
  userRole: string;
  userFullName: string;
};

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: { href: string; label: string }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ userRole, userFullName }: AppSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = getNavItemsForRole(userRole);

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border px-4 md:justify-start">
        <span className="text-sm font-semibold">Mi Rotaract</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          ×
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <NavLinks items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-border p-3">
        <p className="truncate text-xs text-muted-foreground">{userFullName}</p>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-20 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </Button>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-56 shrink-0 transition-transform md:relative md:z-0 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
