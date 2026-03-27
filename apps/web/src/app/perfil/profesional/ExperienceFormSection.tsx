'use client';

import type { CvExperience } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Props = {
  experiences: CvExperience[];
  onChange: (experiences: CvExperience[]) => void;
};

const emptyExperience: CvExperience = {
  company: '',
  role: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
};

export function ExperienceFormSection({ experiences, onChange }: Props) {
  const add = () => onChange([...experiences, { ...emptyExperience }]);
  const remove = (i: number) =>
    onChange(experiences.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<CvExperience>) =>
    onChange(
      experiences.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h2 className="font-medium">Experiencia laboral</h2>
          <p className="text-sm text-muted-foreground">
            Empresa, puesto, fechas y descripción.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {experiences.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin experiencia cargada. Agregá tu primer puesto.
          </p>
        ) : (
          experiences.map((exp, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Experiencia {i + 1}</span>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => update(i, { company: e.target.value })}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div>
                  <Label>Puesto</Label>
                  <Input
                    value={exp.role}
                    onChange={(e) => update(i, { role: e.target.value })}
                    placeholder="Ej: Desarrollador"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Fecha inicio (ej. 2020)</Label>
                  <Input
                    value={exp.startDate ?? ''}
                    onChange={(e) => update(i, { startDate: e.target.value || undefined })}
                    placeholder="MM/AAAA o AAAA"
                  />
                </div>
                <div>
                  <Label>Fecha fin (dejar vacío si es actual)</Label>
                  <Input
                    value={exp.endDate ?? ''}
                    onChange={(e) => update(i, { endDate: e.target.value || undefined })}
                    placeholder="MM/AAAA"
                    disabled={exp.current}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exp.current ?? false}
                  onChange={(e) => {
                    update(i, { current: e.target.checked });
                    if (e.target.checked) update(i, { endDate: undefined });
                  }}
                />
                <span className="text-sm">Trabajo actual</span>
              </label>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={exp.description ?? ''}
                  onChange={(e) => update(i, { description: e.target.value || undefined })}
                  placeholder="Tareas y logros"
                  rows={3}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
