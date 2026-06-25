-- Fase 4 — Funcionalidades complementarias.
-- Documento: documentacion/Gestion-Socios-y-Roles.md §9.

CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TYPE "TransferStatus" AS ENUM (
  'REQUESTED',
  'ACCEPTED_BY_DESTINATION',
  'CONFIRMED_BY_ORIGIN',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

-- MembershipApplication: solicitudes públicas de ingreso (§9.1)
CREATE TABLE "MembershipApplication" (
  "id"           TEXT NOT NULL,
  "clubId"       TEXT NOT NULL,
  "firstName"    TEXT NOT NULL,
  "lastName"     TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "phone"        TEXT,
  "message"      TEXT,
  "status"       "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "memberId"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipApplication_clubId_status_idx" ON "MembershipApplication" ("clubId", "status");
CREATE INDEX "MembershipApplication_clubId_createdAt_idx" ON "MembershipApplication" ("clubId", "createdAt");

ALTER TABLE "MembershipApplication"
  ADD CONSTRAINT "MembershipApplication_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MemberTransferRequest: workflow de doble aprobación entre clubes (§9.2)
CREATE TABLE "MemberTransferRequest" (
  "id"            TEXT NOT NULL,
  "memberId"      TEXT NOT NULL,
  "fromClubId"    TEXT NOT NULL,
  "toClubId"      TEXT NOT NULL,
  "status"        "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason"        TEXT,
  "requestedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedById"  TEXT,
  "acceptedAt"    TIMESTAMP(3),
  "confirmedById" TEXT,
  "confirmedAt"   TIMESTAMP(3),
  "completedAt"   TIMESTAMP(3),
  "rejectedById"  TEXT,
  "rejectedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberTransferRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberTransferRequest_memberId_idx" ON "MemberTransferRequest" ("memberId");
CREATE INDEX "MemberTransferRequest_fromClubId_status_idx" ON "MemberTransferRequest" ("fromClubId", "status");
CREATE INDEX "MemberTransferRequest_toClubId_status_idx" ON "MemberTransferRequest" ("toClubId", "status");

ALTER TABLE "MemberTransferRequest"
  ADD CONSTRAINT "MemberTransferRequest_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MemberTransferRequest_fromClubId_fkey"
    FOREIGN KEY ("fromClubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MemberTransferRequest_toClubId_fkey"
    FOREIGN KEY ("toClubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
