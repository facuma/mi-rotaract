'use client';

import React from 'react';

const steps = [
  { num: '1', title: 'Accede con tu cuenta', text: 'Inicia sesión con las credenciales que te haya dado tu distrito.' },
  { num: '2', title: 'Elige tu módulo', text: 'Reuniones, eventos, club, socios o desarrollo profesional según tu rol.' },
  { num: '3', title: 'Gestiona y participa', text: 'Agenda, votaciones, timers, eventos. Todo en tiempo real.' },
  { num: '4', title: 'Consulta cuando quieras', text: 'Historial, resultados, informes y trazabilidad centralizada.' },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-ink-900 md:text-4xl">
          Cómo funciona
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-ink-600">
          En cuatro pasos estás usando la plataforma.
        </p>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.num} className="relative text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                {s.num}
              </div>
              <h3 className="mb-2 font-semibold text-ink-900">{s.title}</h3>
              <p className="text-sm text-ink-600">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
