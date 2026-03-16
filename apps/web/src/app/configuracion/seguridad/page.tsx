import { PageHeader } from '@/components/layout/PageHeader';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

export default function ConfiguracionSeguridadPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Seguridad"
        description="Cambiá tu contraseña para mantener tu cuenta segura."
      />
      <ChangePasswordForm />
    </div>
  );
}
