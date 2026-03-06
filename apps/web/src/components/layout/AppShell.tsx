'use client';

import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type AppShellProps = {
  title: string;
  user: { fullName: string; role: string };
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
};

export function AppShell({
  title,
  user,
  backHref,
  backLabel = 'Volver',
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <AppSidebar userRole={user.role} userFullName={user.fullName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 pl-14 md:pl-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {backHref && (
                <>
                  <Link
                    href={backHref}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    ← {backLabel}
                  </Link>
                  <Separator orientation="vertical" className="h-4" />
                </>
              )}
              <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
            <span className="text-sm text-muted-foreground">{user.fullName}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
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
