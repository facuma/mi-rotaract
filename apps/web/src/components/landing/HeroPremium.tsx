'use client';

import React from 'react';

type HeroPremiumProps = {
  onCTA: () => void;
};

export default function HeroPremium({ onCTA }: HeroPremiumProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
          Reuniones distritales
        </p>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-ink-900 md:text-5xl lg:text-6xl">
          Digitaliza tus asambleas con votaciones en vivo y agenda ordenada
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-ink-600">
          Mi Rotaract centraliza la agenda, las votaciones y el historial de tus reuniones distritales.
          Participantes y secretaría en la misma plataforma.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onCTA}
            className="w-full rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-primary-hover sm:w-auto"
          >
            Empezar ahora
          </button>
          <a
            href="#how-it-works"
            className="w-full rounded-xl border border-zinc-300 bg-white px-8 py-4 text-center text-lg font-semibold text-ink-900 transition hover:bg-surface-1 sm:w-auto"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  );
}
