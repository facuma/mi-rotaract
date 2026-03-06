'use client';

import React from 'react';

const features = [
  {
    title: 'Agenda y temas',
    description: 'Ordena los temas de la reunión, define tipos (discusión, votación, informativo) y tiempos estimados.',
    icon: '📋',
  },
  {
    title: 'Votaciones en vivo',
    description: 'Los participantes votan Sí, No o Abstención. Un voto por persona. Resultados en tiempo real.',
    icon: '🗳️',
  },
  {
    title: 'Solicitud de palabra',
    description: 'Cola de oradores y control desde secretaría. Timer de intervención para cada turno.',
    icon: '🎤',
  },
  {
    title: 'Timers',
    description: 'Timer por tema y por orador. Avisos cuando se excede el tiempo y registro de incidencias.',
    icon: '⏱️',
  },
  {
    title: 'Historial',
    description: 'Reuniones pasadas, temas tratados, resultados de votaciones y trazabilidad para auditoría.',
    icon: '📁',
  },
  {
    title: 'Roles',
    description: 'Participantes ven solo sus reuniones. Secretaría y presidente gestionan agenda y votaciones.',
    icon: '👥',
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="bg-surface-1 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Todo lo que necesitas en una sola plataforma
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          Diseñado para el flujo real de una asamblea distrital.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-ink-900">{f.title}</h3>
              <p className="text-ink-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
