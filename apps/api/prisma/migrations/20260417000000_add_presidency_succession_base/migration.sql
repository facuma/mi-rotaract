-- Fase 1 — Base de datos no-breaking para sucesión de presidente y sistema de roles.
-- Documento: documentacion/Gestion-Socios-y-Roles.md §12 Fase 1.

-- ============================================================================
-- 1. Nuevos enums
-- ============================================================================

CREATE TYPE "ClubRole" AS ENUM (
  'MEMBER',
  'TREASURER',
  'SECRETARY',
  'VICE_PRESIDENT',
  'PRESIDENT',
  'PRESIDENT_ELECT',
  'PAST_PRESIDENT',
  'CUSTOM'
);

CREATE TYPE "ClubPresidencyStatus" AS ENUM (
  'ELECTED',
  'ACTIVE',
  'ENDED',
  'REVOKED'
);

-- ============================================================================
-- 2. Columnas nuevas en Club y Membership
-- ============================================================================

ALTER TABLE "Club"
  ADD COLUMN "presidencyExtended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Membership"
  ADD COLUMN "clubRole" "ClubRole" NOT NULL DEFAULT 'MEMBER';

-- Backfill Membership.clubRole desde isPresident + title. Mapeo del §8.3 del doc.
UPDATE "Membership"
SET "clubRole" = CASE
  WHEN "isPresident" = true THEN 'PRESIDENT'::"ClubRole"
  WHEN LOWER(TRIM(COALESCE("title", ''))) IN ('vicepresidente', 'vicepresidenta') THEN 'VICE_PRESIDENT'::"ClubRole"
  WHEN LOWER(TRIM(COALESCE("title", ''))) IN ('secretario', 'secretaria') THEN 'SECRETARY'::"ClubRole"
  WHEN LOWER(TRIM(COALESCE("title", ''))) IN ('tesorero', 'tesorera') THEN 'TREASURER'::"ClubRole"
  ELSE 'MEMBER'::"ClubRole"
END;

CREATE INDEX "Membership_clubId_clubRole_idx" ON "Membership" ("clubId", "clubRole");

-- ============================================================================
-- 3. Tabla ClubPresidency
-- ============================================================================

CREATE TABLE "ClubPresidency" (
  "id"          TEXT NOT NULL,
  "clubId"      TEXT NOT NULL,
  "memberId"    TEXT NOT NULL,
  "periodId"    TEXT NOT NULL,
  "status"      "ClubPresidencyStatus" NOT NULL DEFAULT 'ELECTED',
  "startDate"   TIMESTAMP(3),
  "endDate"     TIMESTAMP(3),
  "electedById" TEXT,
  "electedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubPresidency_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClubPresidency_clubId_status_idx" ON "ClubPresidency" ("clubId", "status");
CREATE INDEX "ClubPresidency_clubId_periodId_idx" ON "ClubPresidency" ("clubId", "periodId");
CREATE INDEX "ClubPresidency_memberId_idx" ON "ClubPresidency" ("memberId");
CREATE INDEX "ClubPresidency_periodId_idx" ON "ClubPresidency" ("periodId");

-- Invariante: a lo sumo una presidencia ACTIVE o ELECTED por (club, período).
-- Se permite historial libre de ENDED y REVOKED.
CREATE UNIQUE INDEX "ClubPresidency_one_active_or_elect_per_period"
  ON "ClubPresidency" ("clubId", "periodId", "status")
  WHERE "status" IN ('ACTIVE', 'ELECTED');

ALTER TABLE "ClubPresidency"
  ADD CONSTRAINT "ClubPresidency_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClubPresidency_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClubPresidency_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "DistrictPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ClubPresidency_electedById_fkey"
    FOREIGN KEY ("electedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 4. Tabla ClubBoardPosition
-- ============================================================================

CREATE TABLE "ClubBoardPosition" (
  "id"        TEXT NOT NULL,
  "clubId"    TEXT NOT NULL,
  "memberId"  TEXT NOT NULL,
  "role"      "ClubRole" NOT NULL,
  "periodId"  TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate"   TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubBoardPosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubBoardPosition_clubId_periodId_role_key"
  ON "ClubBoardPosition" ("clubId", "periodId", "role");
CREATE INDEX "ClubBoardPosition_clubId_periodId_idx"
  ON "ClubBoardPosition" ("clubId", "periodId");
CREATE INDEX "ClubBoardPosition_memberId_idx"
  ON "ClubBoardPosition" ("memberId");

ALTER TABLE "ClubBoardPosition"
  ADD CONSTRAINT "ClubBoardPosition_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClubBoardPosition_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClubBoardPosition_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "DistrictPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 5. Data-migration: seed de ClubPresidency desde Member.isPresident
-- ============================================================================

-- Para cada Member.isPresident = true y deletedAt IS NULL, crear una presidency
-- ACTIVE apuntando al DistrictPeriod.isCurrent. Si no hay período actual, no se
-- siembra nada (casos a resolver manualmente quedan registrados más abajo).

INSERT INTO "ClubPresidency" (
  "id", "clubId", "memberId", "periodId", "status", "startDate", "electedAt", "updatedAt"
)
SELECT
  'pres_' || substr(md5(random()::text), 1, 21)   AS "id",
  m."clubId",
  m."id"                                          AS "memberId",
  dp."id"                                         AS "periodId",
  'ACTIVE'::"ClubPresidencyStatus"                AS "status",
  COALESCE(dp."startDate", CURRENT_TIMESTAMP)     AS "startDate",
  CURRENT_TIMESTAMP                               AS "electedAt",
  CURRENT_TIMESTAMP                               AS "updatedAt"
FROM "Member" m
CROSS JOIN LATERAL (
  SELECT "id", "startDate" FROM "DistrictPeriod" WHERE "isCurrent" = true LIMIT 1
) dp
WHERE m."isPresident" = true
  AND m."deletedAt" IS NULL;

-- Log auditable: clubes con isPresident sin período actual (no se pudieron sembrar).
INSERT INTO "AuditLog" ("id", "clubId", "action", "entityType", "entityId", "metadataJson", "createdAt")
SELECT
  'aud_' || substr(md5(random()::text), 1, 22),
  m."clubId",
  'presidency.seed_skipped',
  'Member',
  m."id",
  '{"reason":"no_current_district_period"}',
  CURRENT_TIMESTAMP
FROM "Member" m
WHERE m."isPresident" = true
  AND m."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "DistrictPeriod" WHERE "isCurrent" = true);

-- ============================================================================
-- 6. Data-migration: seed de ClubBoardPosition desde Membership.clubRole != MEMBER
-- ============================================================================

INSERT INTO "ClubBoardPosition" (
  "id", "clubId", "memberId", "role", "periodId", "startDate", "updatedAt"
)
SELECT DISTINCT ON (m."clubId", dp."id", ms."clubRole")
  'bpos_' || substr(md5(random()::text), 1, 20),
  m."clubId",
  m."id"                                          AS "memberId",
  ms."clubRole",
  dp."id"                                         AS "periodId",
  COALESCE(dp."startDate", CURRENT_TIMESTAMP)     AS "startDate",
  CURRENT_TIMESTAMP                               AS "updatedAt"
FROM "Membership" ms
JOIN "Member" m
  ON m."clubId" = ms."clubId"
  AND m."userId" = ms."userId"
  AND m."deletedAt" IS NULL
CROSS JOIN LATERAL (
  SELECT "id", "startDate" FROM "DistrictPeriod" WHERE "isCurrent" = true LIMIT 1
) dp
WHERE ms."clubRole" <> 'MEMBER'
  AND (ms."activeUntil" IS NULL OR ms."activeUntil" > CURRENT_TIMESTAMP)
ORDER BY m."clubId", dp."id", ms."clubRole", m."id";
