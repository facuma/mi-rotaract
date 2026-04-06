-- CreateEnum
CREATE TYPE "ActaStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "MeetingActa" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "status" "ActaStatus" NOT NULL DEFAULT 'DRAFT',
    "contentJson" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeetingActa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingActa_meetingId_key" ON "MeetingActa"("meetingId");

-- AddForeignKey
ALTER TABLE "MeetingActa" ADD CONSTRAINT "MeetingActa_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
