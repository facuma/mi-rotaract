'use client';

import React from 'react';

const cases = [
  {
    title: 'Asamblea distrital',
    description: 'Reunión formal con agenda, votaciones y actas. Secretaría controla temas y oradores.',
  },
  {
    title: 'Reunión de clubes',
    description: 'Varios clubes en una misma reunión. Todos votan y consultan el historial.',
  },
  {
    title: 'Formación y talleres',
    description: 'Usa la agenda y los timers para sesiones formativas con varios bloques.',
  },
];

export default function UseCasesSection() {
  return (
    <section className="bg-surface-1 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Casos de uso
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          Adaptado a los escenarios reales de Rotaract.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {cases.map((c) => (
            <div key={c.title} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="text-ink-600">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
