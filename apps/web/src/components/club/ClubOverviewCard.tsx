'use client';

import Link from 'next/link';
import { EntityHero } from '@/components/ui/entity-hero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ClubSummary = {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  city?: string | null;
  zone?: string | null;
  foundedAt?: string | null;
  informeAlDia?: boolean;
  cuotaAldia?: boolean;
} & Record<string, unknown>;

export function ClubOverviewCard({ club }: { club: ClubSummary }) {
  const location = [club.city, club.zone].filter(Boolean).join(', ');
  const subtitle = [
    club.code,
    location,
    club.foundedAt && `Fundado ${new Date(club.foundedAt).getFullYear()}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const image = club.logoUrl ? (
    <img
      src={club.logoUrl}
      alt={`Logo ${club.name}`}
      className="size-16 rounded-xl object-cover shadow-sm"
    />
  ) : (
    <div className="flex size-16 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-muted-foreground shadow-sm">
      {club.name.charAt(0)}
    </div>
  );

  const badges =
    club.informeAlDia !== undefined || club.cuotaAldia !== undefined ? (
      <>
        {club.informeAlDia !== undefined && (
          <Badge variant={club.informeAlDia ? 'success' : 'destructive'}>
            Informe {club.informeAlDia ? 'al día' : 'pendiente'}
          </Badge>
        )}
        {club.cuotaAldia !== undefined && (
          <Badge variant={club.cuotaAldia ? 'success' : 'destructive'}>
            Cuota {club.cuotaAldia ? 'al día' : 'pendiente'}
          </Badge>
        )}
      </>
    ) : undefined;

  const actions = (
    <>
      <Button asChild size="sm">
        <Link href="/club/informes">Ver informes</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/club/proyectos">Ver proyectos</Link>
      </Button>
    </>
  );

  return (
    <EntityHero
      title={club.name}
      subtitle={subtitle}
      image={image}
      badges={badges}
      actions={actions}
      size="lg"
    />
  );
}
