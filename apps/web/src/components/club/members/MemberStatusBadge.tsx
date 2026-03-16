import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  LICENCIA: 'Licencia',
  EGRESADO: 'Egresado',
  PENDIENTE: 'Pendiente',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  LICENCIA: 'outline',
  EGRESADO: 'secondary',
  PENDIENTE: 'outline',
};

export function MemberStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const variant = STATUS_VARIANTS[status] ?? 'outline';
  return <Badge variant={variant}>{label}</Badge>;
}
