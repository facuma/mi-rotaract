'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DistrictPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/district/informes');
  }, [router]);
  return null;
}
