'use client';

import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AvatarImage } from '@/components/AvatarImage';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppShellProps = {
  title: string;
  user: { id: string; fullName: string; role: string };
  backHref?: string;
  backLabel?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AppShell({
  title,
  user,
  backHref,
  backLabel = 'Volver',
  breadcrumb,
  actions,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <AppSidebar userRole={user.role} userFullName={user.fullName} userId={user.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 h-14 border-b border-border bg-background px-4 pl-14 md:pl-4">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {backHref && (
                <>
                  <Link
                    href={backHref}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    {backLabel}
                  </Link>
                  <Separator orientation="vertical" className="h-4" />
                </>
              )}
              {breadcrumb && breadcrumb.length > 0 && (
                <nav
                  className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"
                  aria-label="Breadcrumb"
                >
                  {breadcrumb.map((item, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden>/</span>}
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-foreground">{item.label}</span>
                      )}
                    </span>
                  ))}
                  <Separator orientation="vertical" className="h-4" />
                </nav>
              )}
              <span className="truncate text-sm font-semibold text-foreground">
                {title}
              </span>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            <div className="flex shrink-0 items-center gap-2">
              <AvatarImage
                userId={user.id}
                alt={user.fullName}
                fallback={user.fullName}
                size={32}
                className="shrink-0"
              />
              <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                {user.fullName}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <main className="p-4 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    </div>
  );
}
