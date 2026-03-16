'use client';

import { useAuth } from '@/context/AuthContext';
import { EditProfileForm } from '@/components/EditProfileForm';
import { AvatarUpload } from '@/components/AvatarUpload';
import { profileApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/ui/form-section';

export default function ConfiguracionPerfilPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Editar perfil"
        description="Actualizá tu foto, nombre y email de la cuenta."
      />

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <FormSection
            title="Foto de perfil"
            description="JPG o PNG, máximo 2 MB."
          >
            <AvatarUpload
            userId={user.id}
            displayName={user.fullName}
            onUpload={async (file) => {
              await profileApi.uploadAvatar(file);
            }}
              canEdit
            />
          </FormSection>
        </CardContent>
      </Card>

      <EditProfileForm />
    </div>
  );
}
