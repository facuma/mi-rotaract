import type { Role } from '@/types/auth';

export const ADMIN_ROLES: Role[] = ['SECRETARY', 'PRESIDENT', 'RDR', 'SUPERADMIN'];

/** Todos los rotaractianos (excluye COMPANY) */
export const ROTARACT_ROLES: Role[] = ['PRESIDENT', 'RDR', 'PARTICIPANT', 'SECRETARY', 'SUPERADMIN'];

export function getDefaultRouteForRole(role: Role): string {
  return role === 'COMPANY' ? '/talento' : '/dashboard';
}
