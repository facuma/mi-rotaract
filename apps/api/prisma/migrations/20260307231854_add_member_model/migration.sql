-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LICENCIA', 'EGRESADO', 'PENDIENTE');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDIENTE',
    "title" TEXT,
    "isPresident" BOOLEAN NOT NULL DEFAULT false,
    "internalNotes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Member_clubId_status_idx" ON "Member"("clubId", "status");

-- CreateIndex
CREATE INDEX "Member_clubId_deletedAt_idx" ON "Member"("clubId", "deletedAt");

-- CreateIndex
CREATE INDEX "Member_clubId_title_idx" ON "Member"("clubId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Member_clubId_email_key" ON "Member"("clubId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_clubId_userId_key" ON "Member"("clubId", "userId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
