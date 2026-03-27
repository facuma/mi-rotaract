'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarImage } from '@/components/AvatarImage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicTalentQuery } from '@/lib/queries';
import type { TalentCard } from '@/lib/api';

function PublicTalentCard({ t }: { t: TalentCard }) {
  return (
    <Link href={`/talento/perfil/${t.id}`}>
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
              <h3 className="font-semibold line-clamp-1">{t.fullName}</h3>
              {t.profession && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {t.profession}
                </p>
              )}
              {t.clubs.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-1">
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

const BLUR_KEY = 'talent_public_blur_seen_at';

export default function TalentoPublicPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [showBlur, setShowBlur] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isCompany = user?.role === 'COMPANY';
  const debouncedQ = useDebouncedValue(q, 400);
  const effectiveQ = useMemo(
    () => (searchTrigger > 0 ? q.trim() : debouncedQ.trim()),
    [searchTrigger, q, debouncedQ],
  );
  const { data, isLoading: loading } = usePublicTalentQuery({
    q: effectiveQ || undefined,
    page,
    limit: 20,
  });

  useEffect(() => {
    if (searchTrigger > 0) {
      setSearchTrigger(0);
    }
  }, [searchTrigger, effectiveQ, page]);

  useEffect(() => {
    if (isCompany) return;
    if (typeof window === 'undefined') return;
    const already = window.localStorage.getItem(BLUR_KEY);
    if (already) return;
    const timer = window.setTimeout(() => {
      setShowBlur(true);
      setShowModal(true);
      window.localStorage.setItem(BLUR_KEY, new Date().toISOString());
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [isCompany]);

  const handleGoToRegister = () => {
    setShowModal(false);
    router.push('/talento/empresas/registro');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Talento Rotaractiano
        </h1>
        <p className="text-sm text-muted-foreground">
          Explorá el talento humano del distrito. Registrá tu empresa para acceder
          al contacto directo.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Input
          placeholder="Buscar por nombre, rol o palabra clave"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => setSearchTrigger((v) => v + 1)}>
          Buscar
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" asChild>
          <Link href="/desarrollo-profesional/talento">
            Soy rotaractiano/a y quiero buscar talento interno
          </Link>
        </Button>
      </div>

      <div className="relative">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Todavía no hay perfiles de talento visibles.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((t) => (
                <PublicTalentCard key={t.id} t={t} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2 text-sm text-muted-foreground">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span>
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

        {showBlur && !isCompany && (
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-background/70 backdrop-blur-sm" />
        )}
      </div>

      <Dialog open={showModal && !isCompany} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accedé al talento rotaractiano</DialogTitle>
            <DialogDescription>
              Después de unos segundos de exploración, bloqueamos parte del
              contenido para proteger a las personas. Registrá tu empresa para
              desbloquear el acceso completo y solicitar contacto con estos
              profesionales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Seguir explorando (limitado)
            </Button>
            <Button onClick={handleGoToRegister}>
              Registrar mi empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

