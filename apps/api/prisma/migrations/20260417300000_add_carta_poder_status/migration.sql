-- CreateEnum
CREATE TYPE "CartaPoderStatus" AS ENUM ('DRAFT', 'PENDING_SECRETARY', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- AlterTable: add new columns to CartaPoder
ALTER TABLE "CartaPoder"
  ADD COLUMN "status"            "CartaPoderStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "secretaryUserId"   TEXT,
  ADD COLUMN "secretarySignedAt" TIMESTAMPTZ,
  ADD COLUMN "delegateDocNumber" TEXT,
  ADD COLUMN "delegateDocType"   TEXT,
  ADD COLUMN "submittedAt"       TIMESTAMPTZ,
  ADD COLUMN "rejectionReason"   TEXT;

-- Backfill: rows that were created before the status machine
UPDATE "CartaPoder" SET status = 'VERIFIED'  WHERE verified = true;
UPDATE "CartaPoder" SET status = 'SUBMITTED' WHERE verified = false;

-- CreateIndex
CREATE INDEX "CartaPoder_clubId_status_idx" ON "CartaPoder"("clubId", "status");
