'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Building2,
  Users,
  UsersRound,
  Building,
  LayoutDashboard,
  FileText,
  FolderKanban,
  UserCog,
  Calendar,
  CalendarDays,
  Settings,
  History,
  CalendarCheck,
  Briefcase,
  Lightbulb,
  Search,
  User,
  Lock,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { getNavItemsForRole } from '@/lib/nav-items';
import type { NavItem } from '@/lib/nav-items';
import { Button } from '@/components/ui/button';
import { AvatarImage } from '@/components/AvatarImage';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  building2: Building2,
  users: Users,
  users2: UsersRound,
  building: Building,
  layoutDashboard: LayoutDashboard,
  fileText: FileText,
  folderKanban: FolderKanban,
  userCog: UserCog,
  calendar: Calendar,
  calendarDays: CalendarDays,
  calendarCheck: CalendarCheck,
  settings: Settings,
  history: History,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  search: Search,
  user: User,
  lock: Lock,
};

function isItemActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

function isParentActive(pathname: string, children: NavItem[]): boolean {
  return children.some((child) => child.href && isItemActive(pathname, child.href));
}

function NavIcon({ name }: { name?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className="size-5 shrink-0 text-current" aria-hidden />;
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleParent = (key: string) => {
    setExpandedParents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item, index) => {
        if (item.children && item.children.length > 0) {
          const parentKey = `parent-${index}`;
          const hasActiveChild = isParentActive(pathname, item.children);
          const isExpanded = hasActiveChild || (expandedParents[parentKey] ?? false);

          return (
            <div key={parentKey} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleParent(parentKey)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  isParentActive(pathname, item.children)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <NavIcon name={item.icon} />
                <span className="min-w-0 flex-1">{item.label}</span>
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    isExpanded ? 'rotate-90' : 'rotate-0',
                  )}
                  aria-hidden
                />
              </button>
              {isExpanded && (
                <div className="ml-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                  {item.children.map((child) => {
                    if (!child.href) return null;
                    const isActive = isItemActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <NavIcon name={child.icon} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (!item.href) return null;

        const isActive = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ userRole, userFullName, userId }: { userRole: string; userFullName: string; userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = getNavItemsForRole(userRole);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.replace('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 md:justify-start">
        <Link
          href="/club"
          onClick={() => setMobileOpen(false)}
          className="font-semibold text-sidebar-foreground transition-colors hover:text-primary"
        >
          Mi Rotaract
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <NavLinks items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <AvatarImage
            userId={userId}
            alt={userFullName}
            fallback={userFullName}
            size={32}
            className="shrink-0"
          />
          <p className="truncate text-xs text-muted-foreground">{userFullName}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
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
        <Menu className="size-5" />
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
