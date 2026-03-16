'use client';

import React from 'react';

const cases = [
  {
    title: 'Reuniones',
    description: 'Agenda, votaciones en vivo, cola de oradores, timers e historial. Secretaría y participantes en la misma sala.',
    icon: '📅',
  },
  {
    title: 'Eventos',
    description: 'Calendario de eventos distritales. Crea y administra actividades, formaciones y encuentros.',
    icon: '📆',
  },
  {
    title: 'Mi Club',
    description: 'Vista general, informes y proyectos del club. Seguimiento y documentación centralizada.',
    icon: '🏛️',
  },
  {
    title: 'Mis Socios',
    description: 'Gestión de socios del club. Altas, bajas y estados en un solo lugar.',
    icon: '👥',
  },
  {
    title: 'Desarrollo Profesional',
    description: 'Oportunidades, búsqueda de talento y perfil profesional para conectar al distrito.',
    icon: '💼',
  },
  {
    title: 'Distrito',
    description: 'Secretaría gestiona informes, clubes y comités. Visión global para coordinación.',
    icon: '🗂️',
  },
];

export default function UseCasesSection() {
  return (
    <section id="modules" className="bg-surface-1 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Módulos de la plataforma
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          Cada área con sus herramientas específicas. Todo en un solo lugar.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="mb-4 text-2xl">{c.icon}</div>
              <h3 className="mb-3 text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="text-ink-600">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
