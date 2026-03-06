'use client';

import React from 'react';
import Link from 'next/link';

export default function FooterPremium() {
  return (
    <footer className="border-t border-zinc-200 bg-surface-1">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 font-semibold text-ink-900">
            <span className="text-xl">🦁</span>
            <span>Mi Rotaract</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-ink-600">
            <a href="#features" className="hover:text-ink-900">Funciones</a>
            <a href="#how-it-works" className="hover:text-ink-900">Cómo funciona</a>
            <a href="#faq" className="hover:text-ink-900">FAQ</a>
            <Link href="/login" className="hover:text-ink-900">Iniciar sesión</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-ink-500">
          Reuniones distritales digitalizadas. © {new Date().getFullYear()} Mi Rotaract.
        </p>
      </div>
    </footer>
  );
}
