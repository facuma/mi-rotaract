'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type NavbarPremiumProps = {
  onCTA: () => void;
};

export default function NavbarPremium({ onCTA }: NavbarPremiumProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-surface-0/95 backdrop-blur supports-[backdrop-filter]:bg-surface-0/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink-900">
          <span className="text-xl">🦁</span>
          <span>Mi Rotaract</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#modules" className="text-sm text-ink-600 hover:text-ink-900">
            Módulos
          </a>
          <a href="#features" className="text-sm text-ink-600 hover:text-ink-900">
            Funciones
          </a>
          <a href="#how-it-works" className="text-sm text-ink-600 hover:text-ink-900">
            Cómo funciona
          </a>
          <a href="#faq" className="text-sm text-ink-600 hover:text-ink-900">
            FAQ
          </a>
          <button
            onClick={onCTA}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
          >
            Acceder
          </button>
        </div>
        <button
          type="button"
          className="md:hidden rounded p-2 text-ink-600 hover:bg-surface-1"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menú"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="border-t border-zinc-200 bg-surface-0 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <a href="#modules" className="py-2 text-ink-600 hover:text-ink-900" onClick={() => setOpen(false)}>
              Módulos
            </a>
            <a href="#features" className="py-2 text-ink-600 hover:text-ink-900" onClick={() => setOpen(false)}>
              Funciones
            </a>
            <a href="#how-it-works" className="py-2 text-ink-600 hover:text-ink-900" onClick={() => setOpen(false)}>
              Cómo funciona
            </a>
            <a href="#faq" className="py-2 text-ink-600 hover:text-ink-900" onClick={() => setOpen(false)}>
              FAQ
            </a>
            <button
              onClick={() => { onCTA(); setOpen(false); }}
              className="mt-2 rounded-lg bg-primary py-2 text-center font-medium text-white"
            >
              Acceder
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
