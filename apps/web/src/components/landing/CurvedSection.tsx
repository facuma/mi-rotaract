'use client';

import React from 'react';

type CurvedSectionProps = {
  onCTA: () => void;
};

export default function CurvedSection({ onCTA }: CurvedSectionProps) {
  return (
    <section className="relative bg-primary px-4 py-20 md:py-28">
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute -top-24 left-0 h-48 w-full text-primary opacity-20"
          viewBox="0 0 1440 120"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" />
        </svg>
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
          ¿Listo para tu próxima reunión?
        </h2>
        <p className="mb-10 text-lg text-blue-100">
          Accede con tu cuenta y únete a las reuniones de tu distrito o gestiona la agenda como secretaría.
        </p>
        <button
          onClick={onCTA}
          className="rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary shadow-lg transition hover:bg-zinc-100"
        >
          Acceder a Mi Rotaract
        </button>
      </div>
    </section>
  );
}
