'use client';

import type { CvLanguage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const LEVEL_OPTIONS = [
  'Nativo',
  'C2',
  'C1',
  'B2',
  'B1',
  'A2',
  'A1',
  'Básico',
  'Intermedio',
  'Avanzado',
];

type Props = {
  languages: CvLanguage[];
  onChange: (languages: CvLanguage[]) => void;
};

const emptyLanguage: CvLanguage = { language: '', level: 'B2' };

export function LanguagesFormSection({ languages, onChange }: Props) {
  const add = () => onChange([...languages, { ...emptyLanguage }]);
  const remove = (i: number) =>
    onChange(languages.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<CvLanguage>) =>
    onChange(
      languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h2 className="font-medium">Idiomas</h2>
          <p className="text-sm text-muted-foreground">
            Idioma y nivel (MCER o descriptivo).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {languages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin idiomas cargados. Agregá el primero.
          </p>
        ) : (
          languages.map((lang, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-3 rounded-lg border p-4 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <Label>Idioma</Label>
                <Input
                  value={lang.language}
                  onChange={(e) => update(i, { language: e.target.value })}
                  placeholder="Ej: Inglés"
                />
              </div>
              <div className="w-full sm:w-40">
                <Label>Nivel</Label>
                <Select
                  value={lang.level || 'B2'}
                  onValueChange={(v) => update(i, { level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0"
                onClick={() => remove(i)}
              >
                Quitar
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
