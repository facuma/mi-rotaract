-- Fase 0 (SRD-Eventos): infraestructura base para extensiones del módulo Eventos.
--   * campos de pago + slug en Event (los datos de pago se usan en Fase 5).
--   * tabla EventDistrictPermission para delegación Distrito -> Club (Fase 1).

-- 1. Nuevos campos en Event ---------------------------------------------------

ALTER TABLE "Event"
  ADD COLUMN "slug"            TEXT,
  ADD COLUMN "isPaid"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paymentOpensAt"  TIMESTAMP(3),
  ADD COLUMN "paymentClosesAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- 2. Enums de permisos delegados ---------------------------------------------

CREATE TYPE "EventPermissionScope" AS ENUM ('DISTRITAL_EVENT_CREATE', 'FINANCIAL_MANAGE');
CREATE TYPE "EventPermissionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- 3. Tabla EventDistrictPermission -------------------------------------------

CREATE TABLE "EventDistrictPermission" (
  "id"          TEXT NOT NULL,
  "clubId"      TEXT NOT NULL,
  "scope"       "EventPermissionScope" NOT NULL,
  "status"      "EventPermissionStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedById" TEXT NOT NULL,
  "grantedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"   TIMESTAMP(3),
  "revokedById" TEXT,
  "revokedAt"   TIMESTAMP(3),
  "notes"       TEXT,

  CONSTRAINT "EventDistrictPermission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventDistrictPermission_clubId_status_idx"
  ON "EventDistrictPermission"("clubId", "status");

CREATE INDEX "EventDistrictPermission_status_expiresAt_idx"
  ON "EventDistrictPermission"("status", "expiresAt");

ALTER TABLE "EventDistrictPermission"
  ADD CONSTRAINT "EventDistrictPermission_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventDistrictPermission"
  ADD CONSTRAINT "EventDistrictPermission_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "EventDistrictPermission"
  ADD CONSTRAINT "EventDistrictPermission_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
