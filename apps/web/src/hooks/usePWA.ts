'use client';

import { useState, useEffect } from 'react';

export function usePWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsPWA(isStandalone);
  }, []);

  return isPWA;
}
