'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { talentApi, clubsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TalentCard, Club } from '@/lib/api';
import { AvatarImage } from '@/components/AvatarImage';

function TalentCardComponent({ t }: { t: TalentCard }) {
  return (
    <Link href={`/desarrollo-profesional/talento/${t.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <AvatarImage
              userId={t.id}
              alt={t.fullName}
              fallback={t.fullName}
              size={48}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{t.fullName}</h3>
          {t.profession && (
            <p className="text-sm text-muted-foreground">{t.profession}</p>
          )}
              {t.clubs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t.clubs.map((c) => c.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        {t.bio && (
          <CardContent className="pt-0">
            <p className="line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

export default function BuscarTalentoPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    items: TalentCard[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [clubId, setClubId] = useState('');
  const [profession, setProfession] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, clubsRes] = await Promise.all([
        talentApi.search({
          q: q || undefined,
          clubId: clubId || undefined,
          profession: profession || undefined,
          page,
          limit: 20,
        }),
        clubsApi.list(),
      ]);
      setData(res);
      setClubs((clubsRes as Club[]) || []);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [q, clubId, profession, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Buscar Talento"
        description="Descubre profesionales dentro del distrito Rotaract."
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-[200px]"
        />
        <Select value={clubId} onValueChange={setClubId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Profesión"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="outline" size="sm" onClick={fetchData}>
          Buscar
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="No hay talentos visibles"
          description="Completá tu perfil profesional y activá la visibilidad para aparecer."
          action={
            <Button variant="outline" asChild>
              <Link href="/perfil/profesional">Completar mi perfil</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((t) => (
              <TalentCardComponent key={t.id} t={t} />
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
