/**
 * Ítems de navegación del sidebar.
 * Para agregar módulos: añadir un objeto a NAV_ITEMS.
 * Los ítems con `children` muestran un submenú colapsable.
 */
export type NavItem = {
  href?: string;
  label: string;
  icon?: string;
  /** Si se define, solo se muestra a usuarios con alguno de estos roles */
  roles?: string[];
  /** Sub-items que se muestran en un submenú colapsable */
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Inicio',
    icon: 'home',
    roles: ['SECRETARY', 'PRESIDENT', 'RDR', 'PARTICIPANT', 'SUPERADMIN'],
  },
  {
    href: '/talento',
    label: 'Talento',
    icon: 'search',
    roles: ['COMPANY'],
  },
  {
    label: 'Distrito',
    icon: 'building2',
    roles: ['SECRETARY', 'PRESIDENT', 'RDR'],
    children: [
      { href: '/admin/district/informes', label: 'Informes', icon: 'fileText' },
      { href: '/admin/district/clubes', label: 'Clubes', icon: 'users' },
      { href: '/admin/district/comites', label: 'Comités', icon: 'users2' },
    ],
  },
  {
    href: '/admin/clubs',
    label: 'Clubes',
    icon: 'users',
    roles: ['SECRETARY', 'PRESIDENT', 'RDR'],
  },
  {
    label: 'Mi Club',
    icon: 'building',
    roles: ['PRESIDENT', 'RDR', 'PARTICIPANT', 'SECRETARY'],
    children: [
      { href: '/club', label: 'Vista general', icon: 'layoutDashboard' },
      { href: '/club/informes', label: 'Informes', icon: 'fileText' },
      { href: '/club/proyectos', label: 'Proyectos', icon: 'folderKanban' },
      { href: '/club/delegaciones', label: 'Delegaciones', icon: 'userCheck', roles: ['PRESIDENT'] },
    ],
  },
  {
    label: 'Mis Socios',
    icon: 'users',
    roles: ['PRESIDENT', 'RDR', 'PARTICIPANT', 'SECRETARY'],
    children: [
      { href: '/club/socios', label: 'Gestión de socios', icon: 'userCog' },
    ],
  },
  {
    label: 'Reuniones',
    icon: 'calendar',
    roles: ['SECRETARY', 'PRESIDENT', 'RDR', 'PARTICIPANT', 'SUPERADMIN'],
    children: [
      { href: '/meetings', label: 'Mis reuniones', icon: 'calendarDays' },
      {
        href: '/admin/meetings',
        label: 'Administrar',
        icon: 'settings',
        roles: ['SECRETARY', 'PRESIDENT', 'RDR'],
      },
      { href: '/history', label: 'Historial', icon: 'history' },
    ],
  },
  {
    label: 'Eventos',
    icon: 'calendarCheck',
    roles: ['SECRETARY', 'PRESIDENT', 'RDR', 'PARTICIPANT', 'SUPERADMIN'],
    children: [
      { href: '/eventos', label: 'Eventos', icon: 'calendar' },
      {
        href: '/admin/eventos',
        label: 'Administrar',
        icon: 'settings',
        roles: ['SECRETARY', 'PRESIDENT', 'RDR'],
      },
    ],
  },
  {
    label: 'Desarrollo Profesional',
    icon: 'briefcase',
    roles: ['PRESIDENT', 'RDR', 'PARTICIPANT', 'SECRETARY'],
    children: [
      {
        href: '/desarrollo-profesional/oportunidades',
        label: 'Oportunidades',
        icon: 'lightbulb',
      },
      {
        href: '/desarrollo-profesional/talento',
        label: 'Buscar Talento',
        icon: 'search',
      },
      { href: '/perfil/profesional', label: 'Mi perfil profesional', icon: 'user' },
    ],
  },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: 'userCog',
    roles: ['SUPERADMIN'],
  },
  {
    label: 'Configuración',
    icon: 'settings',
    children: [
      { href: '/configuracion/perfil', label: 'Editar perfil', icon: 'user' },
      {
        href: '/configuracion/seguridad',
        label: 'Cambiar contraseña',
        icon: 'lock',
      },
    ],
  },
];

export function getNavItemsForRole(role: string): NavItem[] {
  if (role === 'SUPERADMIN') return NAV_ITEMS;
  return NAV_ITEMS.map((item) => {
    if (item.roles && !item.roles.includes(role)) return null;
    if (!item.children) return item;
    const filteredChildren = item.children.filter((child) => {
      if (!child.roles) return true;
      return child.roles.includes(role);
    });
    if (filteredChildren.length === 0) return null;
    return { ...item, children: filteredChildren };
  }).filter((item): item is NavItem => item !== null);
}
