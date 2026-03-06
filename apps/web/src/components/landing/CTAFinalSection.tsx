'use client';

import React from 'react';

type CTAFinalSectionProps = {
  onCTA: () => void;
};

export default function CTAFinalSection({ onCTA }: CTAFinalSectionProps) {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl rounded-3xl bg-primary px-8 py-16 text-center shadow-xl">
        <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
          Únete a Mi Rotaract
        </h2>
        <p className="mb-10 text-lg text-blue-100">
          Accede con tu cuenta y participa en las reuniones de tu distrito o gestiona la agenda como secretaría.
        </p>
        <button
          onClick={onCTA}
          className="rounded-xl bg-white px-10 py-4 text-lg font-semibold text-primary shadow-lg transition hover:bg-zinc-100"
        >
          Acceder ahora
        </button>
      </div>
    </section>
  );
}
