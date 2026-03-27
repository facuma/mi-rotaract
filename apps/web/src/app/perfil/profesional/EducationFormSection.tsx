'use client';

import type { CvEducation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Props = {
  education: CvEducation[];
  onChange: (education: CvEducation[]) => void;
};

const emptyEducation: CvEducation = {
  institution: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
};

export function EducationFormSection({ education, onChange }: Props) {
  const add = () => onChange([...education, { ...emptyEducation }]);
  const remove = (i: number) =>
    onChange(education.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<CvEducation>) =>
    onChange(
      education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h2 className="font-medium">Formación académica</h2>
          <p className="text-sm text-muted-foreground">
            Institución, título o carrera y fechas.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin formación cargada. Agregá tu primer ítem.
          </p>
        ) : (
          education.map((edu, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Formación {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => remove(i)}
                >
                  Quitar
                </Button>
              </div>
              <div>
                <Label>Institución</Label>
                <Input
                  value={edu.institution}
                  onChange={(e) => update(i, { institution: e.target.value })}
                  placeholder="Universidad o centro"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Título / Carrera</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => update(i, { degree: e.target.value })}
                    placeholder="Ej: Licenciatura en Sistemas"
                  />
                </div>
                <div>
                  <Label>Campo o especialidad (opcional)</Label>
                  <Input
                    value={edu.field ?? ''}
                    onChange={(e) => update(i, { field: e.target.value || undefined })}
                    placeholder="Ej: Ingeniería de software"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Fecha inicio (ej. 2015)</Label>
                  <Input
                    value={edu.startDate ?? ''}
                    onChange={(e) => update(i, { startDate: e.target.value || undefined })}
                    placeholder="AAAA"
                  />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input
                    value={edu.endDate ?? ''}
                    onChange={(e) => update(i, { endDate: e.target.value || undefined })}
                    placeholder="AAAA"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
