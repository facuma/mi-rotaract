-- CreateEnum
CREATE TYPE "MotionStatus" AS ENUM ('PROPOSED', 'SECONDED', 'VOTING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "AgendaTopic" ADD COLUMN     "isAttendanceTopic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Motion" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MotionStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedByUserId" TEXT NOT NULL,
    "proposedByClubId" TEXT NOT NULL,
    "secondedByUserId" TEXT,
    "secondedByClubId" TEXT,
    "voteSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTranscription" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicTranscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Motion_voteSessionId_key" ON "Motion"("voteSessionId");

-- CreateIndex
CREATE INDEX "Motion_meetingId_idx" ON "Motion"("meetingId");

-- CreateIndex
CREATE INDEX "Motion_status_idx" ON "Motion"("status");

-- CreateIndex
CREATE INDEX "TopicTranscription_topicId_idx" ON "TopicTranscription"("topicId");

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_proposedByClubId_fkey" FOREIGN KEY ("proposedByClubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_secondedByUserId_fkey" FOREIGN KEY ("secondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_secondedByClubId_fkey" FOREIGN KEY ("secondedByClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_voteSessionId_fkey" FOREIGN KEY ("voteSessionId") REFERENCES "VoteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTranscription" ADD CONSTRAINT "TopicTranscription_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "AgendaTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTranscription" ADD CONSTRAINT "TopicTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
