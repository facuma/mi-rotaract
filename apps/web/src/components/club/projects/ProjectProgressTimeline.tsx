'use client';

import { useState } from 'react';
import { clubApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type ProgressItem = { id: string; description: string; progressDate: string };

export function ProjectProgressTimeline({
  projectId,
  progress,
  onAdded,
}: {
  projectId: string;
  progress: ProgressItem[];
  onAdded?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement)?.value;
    const progressDate = (form.elements.namedItem('progressDate') as HTMLInputElement)?.value;
    if (!description?.trim() || !progressDate) return;

    setLoading(true);
    try {
      await clubApi.projects.addProgress(projectId, {
        description: description.trim(),
        progressDate,
      });
      setShowForm(false);
      onAdded?.();
      form.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Avances</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cerrar' : 'Agregar avance'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                required
                placeholder="Describa el avance..."
              />
            </div>
            <div>
              <Label htmlFor="progressDate">Fecha</Label>
              <Input
                id="progressDate"
                name="progressDate"
                type="date"
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar'}
            </Button>
          </form>
        )}
        {progress.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin avances registrados</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {progress.map((p) => (
              <li key={p.id} className="border-l-2 border-muted pl-3 py-1">
                <p>{p.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.progressDate).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
