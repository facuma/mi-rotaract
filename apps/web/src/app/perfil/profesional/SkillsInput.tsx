'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Props = {
  skills: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  title?: string;
  description?: string;
};

export function SkillsInput({
  skills,
  onChange,
  placeholder = 'Ej: React, TypeScript',
  title = 'Habilidades',
  description = 'Agregá y quitá habilidades (tags).',
}: Props) {
  const [input, setInput] = useState('');

  const add = () => {
    const value = input.trim();
    if (value && !skills.includes(value)) {
      onChange([...skills, value]);
      setInput('');
    }
  };

  const remove = (i: number) => onChange(skills.filter((_, idx) => idx !== i));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Label className="sr-only">Nueva habilidad</Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
            />
          </div>
          <Button type="button" variant="outline" onClick={add} className="shrink-0">
            Agregar
          </Button>
        </div>
        {skills.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
              >
                <span>{s}</span>
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-background/80"
                  onClick={() => remove(i)}
                  aria-label={`Quitar ${s}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin habilidades cargadas.</p>
        )}
      </CardContent>
    </Card>
  );
}
