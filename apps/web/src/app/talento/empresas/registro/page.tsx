'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { companiesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RegistroEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [website, setWebsite] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await companiesApi.register({
        name,
        country: country || undefined,
        city: city || undefined,
        industry: industry || undefined,
        size: size || undefined,
        website: website || undefined,
        contactName,
        contactEmail,
        phone: phone || undefined,
        password,
      });
      toast.success(
        'Empresa registrada. Ya podés iniciar sesión con el email de contacto.',
      );
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrar empresa
        </h1>
        <p className="text-sm text-muted-foreground">
          Registrá tu organización para acceder al talento rotaractiano y
          solicitar contacto con profesionales.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-0">
          <p className="text-sm text-muted-foreground">
            Usaremos estos datos solo para conectar tu empresa con perfiles de
            talento y mantener trazabilidad básica. Podrás editarlos luego.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Razón social / nombre</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="industry">Industria</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="size">Tamaño</Label>
                <Input
                  id="size"
                  placeholder="Startup, PyME, +100, etc."
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contactName">Nombre de contacto</Label>
                <Input
                  id="contactName"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactEmail">Email de contacto</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Contraseña para acceder</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Al registrar tu empresa aceptás que el equipo distrital pueda
              contactar a la persona de referencia para validar la información.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Registrando…' : 'Registrar empresa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

