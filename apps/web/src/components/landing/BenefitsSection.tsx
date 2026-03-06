'use client';

import React from 'react';

const benefits = [
  { title: 'Menos papeles', desc: 'Todo queda registrado en la plataforma.' },
  { title: 'Votaciones claras', desc: 'Un voto por persona, resultados públicos.' },
  { title: 'Agenda visible', desc: 'Todos ven el orden del día y los tiempos.' },
  { title: 'Historial consultable', desc: 'Auditoría y transparencia para el distrito.' },
];

export default function BenefitsSection() {
  return (
    <section className="bg-surface-1 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Beneficios para el distrito
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          Más orden, más confianza y menos trabajo manual.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-2 font-semibold text-ink-900">{b.title}</h3>
              <p className="text-sm text-ink-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
