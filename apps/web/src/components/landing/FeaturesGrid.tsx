'use client';

import React from 'react';

const features = [
  {
    title: 'Votaciones en vivo',
    description: 'Sí, No o Abstención. Un voto por persona. Resultados en tiempo real y trazables.',
    icon: '🗳️',
  },
  {
    title: 'Agenda y timers',
    description: 'Temas ordenados, tiempos estimados y control de turnos en reuniones y talleres.',
    icon: '⏱️',
  },
  {
    title: 'Roles y permisos',
    description: 'Participantes, presidentes y secretaría con acceso según su rol. Seguridad auditada.',
    icon: '👥',
  },
  {
    title: 'Historial y auditoría',
    description: 'Reuniones pasadas, resultados de votaciones y trazabilidad para el distrito.',
    icon: '📁',
  },
  {
    title: 'Calendario de eventos',
    description: 'Eventos distritales, formaciones y encuentros en un solo calendario.',
    icon: '📆',
  },
  {
    title: 'Todo en un lugar',
    description: 'Club, socios, proyectos y desarrollo profesional. PWA disponible para móvil.',
    icon: '📲',
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
          Pensado para el flujo real del distrito Rotaract.
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
