'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { talentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TalentCard } from '@/lib/api';
import { AvatarImage } from '@/components/AvatarImage';

export default function TalentoDetallePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user } = useAuth();
  const [talent, setTalent] = useState<TalentCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    talentApi
      .get(userId)
      .then(setTalent)
      .catch(() => setTalent(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Perfil no encontrado o no visible.
        <br />
        <Link
          href="/desarrollo-profesional/talento"
          className="text-primary underline"
        >
          Volver a buscar talento
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/desarrollo-profesional/talento">← Volver</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <AvatarImage
              userId={talent.id}
              alt={talent.fullName}
              fallback={talent.fullName}
              size={80}
              className="shrink-0"
            />
            <div>
              <h1 className="text-2xl font-semibold">{talent.fullName}</h1>
              {talent.profession && (
                <p className="text-muted-foreground">{talent.profession}</p>
              )}
              {talent.clubs.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Club(es): {talent.clubs.map((c) => c.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {talent.bio && (
            <div>
              <h3 className="font-medium">Resumen</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {talent.bio}
              </p>
            </div>
          )}
          {talent.city && (
            <p className="text-sm text-muted-foreground">Ubicación: {talent.city}</p>
          )}
          {talent.linkedInUrl && (
            <Button variant="outline" asChild>
              <a
                href={talent.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver LinkedIn
              </a>
            </Button>
          )}
          {talent.email && (
            <p className="text-sm">
              Contacto: <a href={`mailto:${talent.email}`} className="text-primary underline">{talent.email}</a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
