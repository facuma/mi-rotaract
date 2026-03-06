/**
 * Ítems de navegación del sidebar.
 * Para agregar módulos: añadir un objeto a NAV_ITEMS.
 */
export type NavItem = {
  href: string;
  label: string;
  icon?: string;
  /** Si se define, solo se muestra a usuarios con alguno de estos roles */
  roles?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin/meetings',
    label: 'Reuniones (admin)',
    roles: ['SECRETARY', 'PRESIDENT'],
  },
  {
    href: '/meetings',
    label: 'Mis reuniones',
  },
  {
    href: '/history',
    label: 'Historial',
  },
];

export function getNavItemsForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });
}
