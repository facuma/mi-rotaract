'use client';

import React, { useState } from 'react';

const faqs = [
  {
    q: '¿Quién puede crear reuniones?',
    a: 'Solo usuarios con rol de Secretaría o Presidente pueden crear y gestionar reuniones. Los participantes ven solo las reuniones a las que están asignados.',
  },
  {
    q: '¿Cómo se vota?',
    a: 'Cuando la secretaría abre una votación, los participantes ven las opciones (Sí, No, Abstención) y confirman su voto. Solo se permite un voto por persona por votación.',
  },
  {
    q: '¿Se puede usar en el móvil?',
    a: 'Sí. La web es responsive y puedes instalarla como PWA para usarla como una app en el teléfono.',
  },
  {
    q: '¿Qué pasa con el historial?',
    a: 'Todas las reuniones finalizadas quedan en el historial. Puedes consultar temas, resultados de votaciones y trazabilidad según tu rol.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-surface-1 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Preguntas frecuentes
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-ink-600">
          Respuestas rápidas a las dudas más comunes.
        </p>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-4 text-left font-medium text-ink-900 hover:bg-surface-1"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {faq.q}
                <span className="text-ink-500">
                  {openIndex === i ? '−' : '+'}
                </span>
              </button>
              {openIndex === i && (
                <div className="border-t border-zinc-200 px-4 py-3 text-ink-600">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
