-- Fase 4 (SRD-Eventos §4.4 RF-EM-002): Recordatorios programables por evento.
--   * remindersAt: timestamps cuando se debe disparar cada recordatorio.
--   * sentReminders: timestamps ya procesados, para evitar reenvíos por el cron.

ALTER TABLE "Event"
  ADD COLUMN "remindersAt"   TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
  ADD COLUMN "sentReminders" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[];
