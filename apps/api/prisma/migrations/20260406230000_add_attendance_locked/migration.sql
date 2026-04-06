ALTER TABLE "Meeting" ADD COLUMN "attendanceLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN "attendanceLockedAt" TIMESTAMP(3);
