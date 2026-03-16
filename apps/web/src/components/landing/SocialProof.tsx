'use client';

import React from 'react';

export default function SocialProof() {
  const items = [
    'Reuniones',
    'Eventos',
    'Mi Club',
    'Mis Socios',
    'Desarrollo profesional',
  ];

  return (
    <section className="border-y border-zinc-200 bg-surface-1 py-8">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="mb-6 text-center text-sm font-medium text-ink-500">
          Pensado para distritos Rotaract
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {items.map((label) => (
            <span
              key={label}
              className="flex items-center gap-2 text-ink-600"
            >
              <span className="h-2 w-2 rounded-full bg-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
