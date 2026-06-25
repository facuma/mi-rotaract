-- Fase 2 (SRD-Eventos): Inscripciones + plantillas/logs de email.
--   * EventRegistration con campos para QR/check-in (anticipa Fase 3).
--   * EventEmailTemplate y EventEmailLog para personalización y trazabilidad.

-- 1. Enums --------------------------------------------------------------------

CREATE TYPE "RegistrationStatus" AS ENUM (
  'CONFIRMED',
  'WAITLISTED',
  'PENDING_PAYMENT',
  'CANCELLED',
  'NO_SHOW'
);

CREATE TYPE "EmailTemplateType" AS ENUM (
  'REGISTRATION_CONFIRMATION',
  'REMINDER',
  'EVENT_CANCELLED',
  'PAYMENT_WINDOW_OPEN',
  'PAYMENT_WINDOW_CLOSING',
  'WAITLIST_PROMOTED'
);

CREATE TYPE "EmailStatus" AS ENUM (
  'QUEUED',
  'SENT',
  'FAILED',
  'BOUNCED'
);

-- 2. EventRegistration --------------------------------------------------------

CREATE TABLE "EventRegistration" (
  "id"               TEXT NOT NULL,
  "eventId"          TEXT NOT NULL,
  "userId"           TEXT,
  "email"            TEXT NOT NULL,
  "fullName"         TEXT NOT NULL,
  "phone"            TEXT,
  "status"           "RegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "waitlistPosition" INTEGER,
  "checkInToken"     TEXT,
  "checkedInAt"      TIMESTAMP(3),
  "checkedInById"    TEXT,
  "cancelledAt"      TIMESTAMP(3),
  "additionalData"   TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRegistration_checkInToken_key"
  ON "EventRegistration"("checkInToken");

CREATE UNIQUE INDEX "EventRegistration_eventId_email_key"
  ON "EventRegistration"("eventId", "email");

CREATE INDEX "EventRegistration_eventId_status_idx"
  ON "EventRegistration"("eventId", "status");

CREATE INDEX "EventRegistration_userId_idx"
  ON "EventRegistration"("userId");

ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_checkedInById_fkey"
  FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. EventEmailTemplate -------------------------------------------------------

CREATE TABLE "EventEmailTemplate" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "type"      "EmailTemplateType" NOT NULL,
  "subject"   TEXT NOT NULL,
  "bodyHtml"  TEXT NOT NULL,
  "bodyText"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventEmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventEmailTemplate_eventId_type_key"
  ON "EventEmailTemplate"("eventId", "type");

ALTER TABLE "EventEmailTemplate"
  ADD CONSTRAINT "EventEmailTemplate_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. EventEmailLog ------------------------------------------------------------

CREATE TABLE "EventEmailLog" (
  "id"                TEXT NOT NULL,
  "eventId"           TEXT NOT NULL,
  "registrationId"    TEXT,
  "toEmail"           TEXT NOT NULL,
  "templateType"      "EmailTemplateType" NOT NULL,
  "status"            "EmailStatus" NOT NULL DEFAULT 'QUEUED',
  "providerMessageId" TEXT,
  "sentAt"            TIMESTAMP(3),
  "error"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventEmailLog_eventId_templateType_idx"
  ON "EventEmailLog"("eventId", "templateType");

CREATE INDEX "EventEmailLog_status_idx"
  ON "EventEmailLog"("status");

CREATE INDEX "EventEmailLog_registrationId_idx"
  ON "EventEmailLog"("registrationId");

ALTER TABLE "EventEmailLog"
  ADD CONSTRAINT "EventEmailLog_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventEmailLog"
  ADD CONSTRAINT "EventEmailLog_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
