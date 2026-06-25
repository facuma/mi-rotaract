-- Panel SuperAdmin: nuevo rol, flag de password temporal y tipo de notificación.

-- 1. Nuevo valor en Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';

-- 2. Flag para forzar cambio de password post-reset
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- 3. Nuevo NotificationType para avisar al presidente cuando un admin
--    asigna un socio a su club de forma directa.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADMIN_ASSIGNED_TO_CLUB';
