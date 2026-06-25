-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CASH', 'CARD', 'MERCADO_PAGO', 'OTHER');

-- CreateEnum
CREATE TYPE "MealScanResult" AS ENUM ('CONSUMED', 'ALREADY_CONSUMED', 'OUTSIDE_WINDOW', 'REGISTRATION_NOT_CONFIRMED', 'WRONG_EVENT', 'INVALID_TOKEN', 'MEAL_NOT_FOUND');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailTemplateType" ADD VALUE 'PAYMENT_RECORDED';
ALTER TYPE "EmailTemplateType" ADD VALUE 'INSTALLMENT_DUE_REMINDER';
ALTER TYPE "EmailTemplateType" ADD VALUE 'PAYMENT_COMPLETE';

-- DropForeignKey
ALTER TABLE "EventCheckInLog" DROP CONSTRAINT "EventCheckInLog_scannedById_fkey";

-- DropForeignKey
ALTER TABLE "EventDistrictPermission" DROP CONSTRAINT "EventDistrictPermission_grantedById_fkey";

-- DropForeignKey
ALTER TABLE "EventDistrictPermission" DROP CONSTRAINT "EventDistrictPermission_revokedById_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cancellationClosesAt" TIMESTAMP(3),
ADD COLUMN     "changesClosesAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventTicket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInstallment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPayment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receiptNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMeal" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servedAt" TIMESTAMP(3) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistrationForm" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistrationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMealConsumption" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedById" TEXT NOT NULL,
    "deviceInfo" TEXT,

    CONSTRAINT "EventMealConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_eventId_key" ON "EventTicket"("eventId");

-- CreateIndex
CREATE INDEX "EventInstallment_eventId_idx" ON "EventInstallment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInstallment_eventId_order_key" ON "EventInstallment"("eventId", "order");

-- CreateIndex
CREATE INDEX "EventPayment_registrationId_status_idx" ON "EventPayment"("registrationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventPayment_registrationId_installmentId_key" ON "EventPayment"("registrationId", "installmentId");

-- CreateIndex
CREATE INDEX "EventMeal_eventId_order_idx" ON "EventMeal"("eventId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistrationForm_eventId_key" ON "EventRegistrationForm"("eventId");

-- CreateIndex
CREATE INDEX "EventMealConsumption_mealId_consumedAt_idx" ON "EventMealConsumption"("mealId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventMealConsumption_mealId_registrationId_key" ON "EventMealConsumption"("mealId", "registrationId");

-- AddForeignKey
ALTER TABLE "EventDistrictPermission" ADD CONSTRAINT "EventDistrictPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDistrictPermission" ADD CONSTRAINT "EventDistrictPermission_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckInLog" ADD CONSTRAINT "EventCheckInLog_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInstallment" ADD CONSTRAINT "EventInstallment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPayment" ADD CONSTRAINT "EventPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPayment" ADD CONSTRAINT "EventPayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "EventInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPayment" ADD CONSTRAINT "EventPayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMeal" ADD CONSTRAINT "EventMeal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistrationForm" ADD CONSTRAINT "EventRegistrationForm_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMealConsumption" ADD CONSTRAINT "EventMealConsumption_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "EventMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMealConsumption" ADD CONSTRAINT "EventMealConsumption_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMealConsumption" ADD CONSTRAINT "EventMealConsumption_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
