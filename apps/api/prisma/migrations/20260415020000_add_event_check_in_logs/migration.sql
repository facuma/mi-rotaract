-- Fase 3 (SRD-Eventos §4.5): Check-in y auditoría de escaneos de QR.

CREATE TYPE "CheckInResult" AS ENUM (
  'CHECKED_IN',
  'ALREADY_CHECKED_IN',
  'INVALID_TOKEN',
  'WRONG_EVENT',
  'REGISTRATION_CANCELLED',
  'PAYMENT_PENDING',
  'EVENT_NOT_OPEN',
  'FORBIDDEN'
);

CREATE TABLE "EventCheckInLog" (
  "id"             TEXT NOT NULL,
  "eventId"        TEXT NOT NULL,
  "registrationId" TEXT,
  "token"          TEXT NOT NULL,
  "result"         "CheckInResult" NOT NULL,
  "scannedById"    TEXT NOT NULL,
  "deviceInfo"     TEXT,
  "scannedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventCheckInLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventCheckInLog_eventId_scannedAt_idx"
  ON "EventCheckInLog"("eventId", "scannedAt");

CREATE INDEX "EventCheckInLog_registrationId_idx"
  ON "EventCheckInLog"("registrationId");

ALTER TABLE "EventCheckInLog"
  ADD CONSTRAINT "EventCheckInLog_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventCheckInLog"
  ADD CONSTRAINT "EventCheckInLog_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventCheckInLog"
  ADD CONSTRAINT "EventCheckInLog_scannedById_fkey"
  FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
