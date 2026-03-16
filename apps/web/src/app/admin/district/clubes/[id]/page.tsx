'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { districtApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Authority = {
  userId: string;
  fullName: string;
  email: string;
  title: string | null;
  isPresident: boolean;
  activeFrom: string;
  activeUntil: string | null;
};

type ClubFicha = {
  id: string;
  name: string;
  code: string;
  status: string;
  presidentEmail: string | null;
  enabledForDistrictMeetings: boolean;
  cuotaAldia: boolean;
  informeAlDia: boolean;
  authorities: Authority[];
  recentReports: { id: string; type: string; status: string; districtPeriod: { name: string } }[];
};

export default function DistrictClubFichaPage() {
  const params = useParams();
  const id = params.id as string;
  const [club, setClub] = useState<ClubFicha | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    districtApi.clubs
      .get(id)
      .then(setClub as (c: unknown) => void)
      .catch((e) => setError(e.message));
  }, [id]);

  if (!club && !error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !club) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/district/clubes">Volver a clubes</Link>
        </Button>
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/district/clubes">← Volver</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{club.name} ({club.code})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estado: {club.status} · Email presidente: {club.presidentEmail ?? '—'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Métricas</h3>
            <ul className="text-sm space-y-1">
              <li>Informe al día: {club.informeAlDia ? 'Sí' : 'No'}</li>
              <li>Cuota al día: {club.cuotaAldia ? 'Sí' : 'No'}</li>
              <li>Habilitado para reuniones distritales: {club.enabledForDistrictMeetings ? 'Sí' : 'No'}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Autoridades</h3>
            {club.authorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin autoridades cargadas.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {club.authorities.map((a) => (
                  <li key={a.userId}>
                    {a.fullName} {a.isPresident ? '(Presidente)' : ''} — {a.title ?? '—'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Informes recientes</h3>
            {club.recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin informes.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {club.recentReports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/district/informes/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      {r.districtPeriod.name} — {r.type} — {r.status}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href={`/admin/district/informes?clubId=${club.id}`}>
                Ver todos los informes
              </Link>
            </Button>
          </div>
          <div>
            <Button asChild>
              <Link href={`/admin/clubs?edit=${club.id}`}>Editar club (admin)</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
