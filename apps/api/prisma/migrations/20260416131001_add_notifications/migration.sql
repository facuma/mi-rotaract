-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION_CREATED', 'REGISTRATION_CANCELLED', 'PAYMENT_RECORDED', 'CHECKIN_PERFORMED', 'EVENT_CANCELLED', 'EVENT_REMINDER', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'INSTALLMENT_DUE', 'WAITLIST_PROMOTED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" TEXT,
    "eventId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
