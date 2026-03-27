'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { talentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarImage } from '@/components/AvatarImage';

export default function TalentoPerfilPublicPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [talent, setTalent] = useState<Awaited<ReturnType<typeof talentApi.get>> | null>(null);

  const isCompany = user?.role === 'COMPANY';

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    talentApi
      .get(userId)
      .then(setTalent)
      .catch(() => setTalent(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="space-y-4 px-4 py-10">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/talento">← Volver al listado</Link>
        </Button>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Perfil no encontrado o no visible.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/talento">← Volver al listado</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <AvatarImage
              userId={talent.id}
              alt={talent.fullName}
              fallback={talent.fullName}
              size={80}
              className="shrink-0"
            />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{talent.fullName}</h1>
              {talent.profession && (
                <p className="text-muted-foreground">{talent.profession}</p>
              )}
              {talent.city && (
                <p className="text-sm text-muted-foreground">
                  Ubicación: {talent.city}
                </p>
              )}
              {talent.clubs.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Club(es): {talent.clubs.map((c) => c.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {talent.bio && (
            <section>
              <h2 className="mb-1 text-sm font-medium">Resumen</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {talent.bio}
              </p>
            </section>
          )}

          <section className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <h2 className="text-sm font-medium">
              ¿Querés contactar a este talento?
            </h2>
            {!isCompany ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Para proteger a las personas, los datos de contacto solo se muestran
                  a empresas registradas y verificadas. Registrá tu empresa para
                  desbloquear el acceso al detalle de contacto y enviar solicitudes
                  formales.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push('/talento/empresas/registro')}
                  >
                    Registrar mi empresa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/talento')}
                  >
                    Volver al listado
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Estás logueado como empresa. En una siguiente iteración, desde aquí
                vas a poder enviar una solicitud de contacto directa a este perfil.
              </p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

