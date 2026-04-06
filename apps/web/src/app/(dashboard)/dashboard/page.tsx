'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, type DashboardResponse } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { DashboardWidget } from '@/components/dashboard/DashboardWidget';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const ROLE_LABELS: Record<string, string> = {
  PARTICIPANT: 'participante',
  PRESIDENT: 'presidente',
  RDR: 'representante distrital',
  SECRETARY: 'secretaría',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (!user) return null;

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  const roleLabel = ROLE_LABELS[data.role] ?? data.role;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inicio"
        description={`Hola, ${user.fullName}. Rol: ${roleLabel}`}
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.widgets.map((widget) => (
          <div
            key={widget.id}
            className={
              widget.id === 'upcoming-meetings' ? 'md:col-span-2' : undefined
            }
          >
            <DashboardWidget widget={widget} />
          </div>
        ))}
      </div>
    </div>
  );
}
