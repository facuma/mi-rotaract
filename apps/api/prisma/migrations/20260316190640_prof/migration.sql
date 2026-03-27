-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TalentContactRequestStatus" AS ENUM ('NEW', 'SHARED_WITH_MEMBER', 'CLOSED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COMPANY';

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "website" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentContactRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "talentUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" "TalentContactRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "handledByUserId" TEXT,

    CONSTRAINT "TalentContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerUserId_key" ON "Company"("ownerUserId");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "TalentContactRequest_companyId_idx" ON "TalentContactRequest"("companyId");

-- CreateIndex
CREATE INDEX "TalentContactRequest_talentUserId_idx" ON "TalentContactRequest"("talentUserId");

-- CreateIndex
CREATE INDEX "TalentContactRequest_status_createdAt_idx" ON "TalentContactRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentContactRequest" ADD CONSTRAINT "TalentContactRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentContactRequest" ADD CONSTRAINT "TalentContactRequest_talentUserId_fkey" FOREIGN KEY ("talentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
