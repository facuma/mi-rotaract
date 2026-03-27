'use client';

import { useEffect, useState } from 'react';
import {
  profileApi,
  getAvatarUrl,
  parseExperienceJson,
  parseEducationJson,
  parseLanguagesJson,
  type CvExperience,
  type CvEducation,
  type CvLanguage,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { ExperienceFormSection } from './ExperienceFormSection';
import { EducationFormSection } from './EducationFormSection';
import { LanguagesFormSection } from './LanguagesFormSection';
import { SkillsInput } from './SkillsInput';
import { CvPdfDocument } from './CvPdfDocument';

export default function PerfilProfesionalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [talentVisible, setTalentVisible] = useState(false);
  const [contactEmailPublic, setContactEmailPublic] = useState(false);
  const [experiences, setExperiences] = useState<CvExperience[]>([]);
  const [education, setEducation] = useState<CvEducation[]>([]);
  const [languages, setLanguages] = useState<CvLanguage[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');

  useEffect(() => {
    profileApi
      .getMe()
      .then((p) => {
        setProfession(p.profession ?? '');
        setBio(p.bio ?? '');
        setCity(p.city ?? '');
        setLinkedInUrl(p.linkedInUrl ?? '');
        setTalentVisible(p.talentVisible ?? false);
        setContactEmailPublic(p.contactEmailPublic ?? false);
        setExperiences(parseExperienceJson(p.experienceJson));
        setEducation(parseEducationJson(p.educationJson));
        setLanguages(parseLanguagesJson(p.languagesJson));
        setSkills(p.skills ?? []);
        setAvailability(p.availability ?? '');
      })
      .catch(() => toast.error('Error al cargar perfil'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.upsert({
        profession: profession.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        talentVisible,
        contactEmailPublic,
        experienceJson:
          experiences.length > 0 ? JSON.stringify(experiences) : undefined,
        educationJson:
          education.length > 0 ? JSON.stringify(education) : undefined,
        languagesJson:
          languages.length > 0 ? JSON.stringify(languages) : undefined,
        skills: skills.length > 0 ? skills : undefined,
        availability: availability.trim() || undefined,
      });
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!user) return;
    setDownloadingPdf(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('mi_rotaract_token')
          : null;
      let photoDataUrl: string | null = null;
      try {
        const res = await fetch(getAvatarUrl(user.id), {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const blob = await res.blob();
          photoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // Sin foto si falla CORS o auth
      }

      const { pdf } = await import('@react-pdf/renderer');
      const doc = (
        <CvPdfDocument
          fullName={user.fullName}
          email={user.email}
          profession={profession || null}
          bio={bio || null}
          city={city || null}
          linkedInUrl={linkedInUrl || null}
          experiences={experiences}
          education={education}
          languages={languages}
          skills={skills}
          photoDataUrl={photoDataUrl}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${user.fullName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CV descargado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al generar el PDF',
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Mi perfil profesional</h1>
      <p className="text-sm text-muted-foreground">
        Completa tu perfil para aparecer en Buscar Talento. Activa la
        visibilidad cuando quieras que otros puedan encontrarte.
      </p>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Foto de perfil</h2>
          <p className="text-sm text-muted-foreground">
            JPG o PNG, máximo 2 MB.
          </p>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            userId={user.id}
            displayName={user.fullName}
            onUpload={async (file) => {
              await profileApi.uploadAvatar(file);
            }}
            canEdit
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Datos públicos</h2>
          <p className="text-sm text-muted-foreground">
            Se mostrarán en tu ficha cuando actives la visibilidad.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profession">Profesión</Label>
              <Input
                id="profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Ej: Ingeniero de Software"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio breve</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Breve descripción profesional (máx. 500 caracteres)"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/500</p>
            </div>
            <div>
              <Label htmlFor="city">Ciudad / Región</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Buenos Aires"
              />
            </div>
            <div>
              <Label htmlFor="linkedInUrl">LinkedIn</Label>
              <Input
                id="linkedInUrl"
                type="url"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ExperienceFormSection
        experiences={experiences}
        onChange={setExperiences}
      />
      <EducationFormSection education={education} onChange={setEducation} />
      <LanguagesFormSection
        languages={languages}
        onChange={setLanguages}
      />
      <SkillsInput skills={skills} onChange={setSkills} />

      <Card>
        <CardHeader>
          <h2 className="font-medium">Disponibilidad y privacidad</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="availability">Disponibilidad (opcional)</Label>
              <Input
                id="availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="Ej: Inmediata, Part-time"
                maxLength={50}
              />
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">Privacidad</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={talentVisible}
                  onChange={(e) => setTalentVisible(e.target.checked)}
                />
                <span className="text-sm">
                  Quiero aparecer en Buscar Talento (necesitas profesión o bio)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={contactEmailPublic}
                  onChange={(e) => setContactEmailPublic(e.target.checked)}
                />
                <span className="text-sm">
                  Mostrar mi email en la ficha pública
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar perfil'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
              >
                {downloadingPdf ? 'Generando...' : 'Descargar CV (PDF)'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </form>
    </div>
  );
}
