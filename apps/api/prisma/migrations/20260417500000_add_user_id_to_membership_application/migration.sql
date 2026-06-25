-- Fase 4.2 — Onboarding autenticado.
-- Vincula MembershipApplication al User solicitante.
--
-- Estrategia:
--   1. Agrega la columna como nullable.
--   2. Intenta vincular filas existentes por email (flujo público deprecado).
--   3. Borra las que no matchearon (son huérfanas del flujo público sin cuenta).
--   4. Marca NOT NULL + FK + índice.

-- 1. Agregar columna nullable
ALTER TABLE "MembershipApplication" ADD COLUMN "userId" TEXT;

-- 2. Intentar vincular por email con User existente
UPDATE "MembershipApplication" ma
SET "userId" = u.id
FROM "User" u
WHERE u.email = ma.email
  AND ma."userId" IS NULL;

-- 3. Borrar filas huérfanas (solicitudes del flujo público sin cuenta).
--    Cualquier solicitud PENDING/APPROVED/REJECTED que no vincule a un User
--    ya no puede convivir con el nuevo modelo de onboarding autenticado.
DELETE FROM "MembershipApplication" WHERE "userId" IS NULL;

-- 4. Enforce NOT NULL
ALTER TABLE "MembershipApplication" ALTER COLUMN "userId" SET NOT NULL;

-- 5. FK con cascade
ALTER TABLE "MembershipApplication"
  ADD CONSTRAINT "MembershipApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Índice por (userId, status) para lookups del solicitante.
CREATE INDEX "MembershipApplication_userId_status_idx"
  ON "MembershipApplication"("userId", status);
