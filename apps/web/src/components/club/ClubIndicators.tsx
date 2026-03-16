'use client';

import { Badge } from '@/components/ui/badge';

export function ClubIndicators({
  informeAlDia,
  cuotaAldia,
}: {
  informeAlDia: boolean;
  cuotaAldia: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={informeAlDia ? 'default' : 'destructive'}>
        Informe {informeAlDia ? 'al día' : 'pendiente'}
      </Badge>
      <Badge variant={cuotaAldia ? 'default' : 'destructive'}>
        Cuota {cuotaAldia ? 'al día' : 'pendiente'}
      </Badge>
    </div>
  );
}
