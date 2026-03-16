'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clubApi, type ClubSummary } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClubOverviewCard } from '@/components/club/ClubOverviewCard';
import { ClubAuthoritiesList } from '@/components/club/ClubAuthoritiesList';
import { ClubEditableFields } from '@/components/club/ClubEditableFields';
import { useAuth } from '@/context/AuthContext';

export default function ClubPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ClubSummary | null>(null);
  const [error, setError] = useState('');
  const isPresident = user?.role === 'PRESIDENT';

  useEffect(() => {
    clubApi
      .getSummary()
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  const handleUpdate = (data: Parameters<typeof clubApi.updateMe>[0]) => {
    return clubApi.updateMe(data).then(setSummary);
  };

  if (!summary && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/meetings">Volver</Link>
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <ClubOverviewCard club={summary} />
      <ClubAuthoritiesList memberships={summary.memberships} />
      {summary.description && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Descripción institucional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {summary.description}
            </p>
          </CardContent>
        </Card>
      )}
      {(summary.contactEmail || summary.contactPhone) && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {summary.contactEmail && (
              <p>
                <span className="text-muted-foreground">Email:</span>{' '}
                <a
                  href={`mailto:${summary.contactEmail}`}
                  className="text-primary hover:underline"
                >
                  {summary.contactEmail}
                </a>
              </p>
            )}
            {summary.contactPhone && (
              <p>
                <span className="text-muted-foreground">Teléfono:</span>{' '}
                {summary.contactPhone}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {isPresident && (
        <ClubEditableFields club={summary} onUpdate={handleUpdate} />
      )}
      {summary.recentActivity && summary.recentActivity.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {summary.recentActivity.map((a) => (
                <li key={`${a.type}-${a.id}`}>
                  <Link
                    href={
                      a.type === 'report'
                        ? `/club/informes/${a.id}`
                        : `/club/proyectos/${a.id}`
                    }
                    className="font-medium text-primary transition-colors hover:underline"
                  >
                    {a.label}
                  </Link>
                  <span className="ml-1 text-muted-foreground">
                    — {a.status} · {new Date(a.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
