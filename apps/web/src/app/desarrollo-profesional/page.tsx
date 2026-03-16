'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DesarrolloProfesionalHubPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/desarrollo-profesional/oportunidades');
  }, [router]);
  return null;
}
