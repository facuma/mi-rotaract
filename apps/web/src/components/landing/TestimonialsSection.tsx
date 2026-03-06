'use client';

import React from 'react';

const testimonials = [
  {
    quote: 'Las votaciones en vivo nos ahorran tiempo y dan confianza a los socios.',
    role: 'Secretaría distrital',
  },
  {
    quote: 'Por fin tenemos un historial claro de lo que se votó y cuándo.',
    role: 'Presidente de distrito',
  },
  {
    quote: 'Participar desde el móvil con la PWA es muy cómodo.',
    role: 'Participante',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Lo que dicen los distritos
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          Experiencias de uso en asambleas reales.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <blockquote key={i} className="rounded-2xl border border-zinc-200 bg-surface-1 p-6">
              <p className="mb-4 text-ink-900">&ldquo;{t.quote}&rdquo;</p>
              <cite className="text-sm not-italic text-ink-500">— {t.role}</cite>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
