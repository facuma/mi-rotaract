-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');
CREATE TYPE "VotingMethod" AS ENUM ('PUBLIC', 'SECRET');
CREATE TYPE "MajorityType" AS ENUM ('SIMPLE', 'ABSOLUTE', 'TWO_THIRDS', 'THREE_QUARTERS');

-- AlterEnum: Add RDR to Role
ALTER TYPE "Role" ADD VALUE 'RDR';

-- AlterEnum: Add new EventType values
ALTER TYPE "EventType" ADD VALUE 'CONFERENCIA';
ALTER TYPE "EventType" ADD VALUE 'ERIPA';
ALTER TYPE "EventType" ADD VALUE 'FORO_ZONAL';
ALTER TYPE "EventType" ADD VALUE 'SEMINARIO_INSTRUCTORES';

-- AlterTable: Meeting
ALTER TABLE "Meeting" ADD COLUMN "type" "MeetingType" NOT NULL DEFAULT 'ORDINARY';
ALTER TABLE "Meeting" ADD COLUMN "isDistrictMeeting" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Meeting" ADD COLUMN "quorumRequired" INTEGER;
ALTER TABLE "Meeting" ADD COLUMN "quorumMet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN "isInformationalOnly" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Meeting_type_idx" ON "Meeting"("type");

-- AlterTable: VoteSession
ALTER TABLE "VoteSession" ADD COLUMN "votingMethod" "VotingMethod" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "VoteSession" ADD COLUMN "requiredMajority" "MajorityType" NOT NULL DEFAULT 'SIMPLE';
ALTER TABLE "VoteSession" ADD COLUMN "isElection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoteSession" ADD COLUMN "rdrTiebreakerUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoteSession" ADD COLUMN "rdrTiebreakerChoice" "VoteChoice";

-- AlterTable: Vote
ALTER TABLE "Vote" ADD COLUMN "clubId" TEXT;
CREATE INDEX "Vote_voteSessionId_clubId_idx" ON "Vote"("voteSessionId", "clubId");

-- AlterTable: MeetingParticipant
ALTER TABLE "MeetingParticipant" ADD COLUMN "clubId" TEXT;
ALTER TABLE "MeetingParticipant" ADD COLUMN "isDelegate" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "MeetingParticipant_meetingId_clubId_idx" ON "MeetingParticipant"("meetingId", "clubId");

-- AlterTable: Club
ALTER TABLE "Club" ADD COLUMN "isConstituido" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: CartaPoder
CREATE TABLE "CartaPoder" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "presidentUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "documentUrl" TEXT,
    CONSTRAINT "CartaPoder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartaPoder_meetingId_clubId_key" ON "CartaPoder"("meetingId", "clubId");
CREATE INDEX "CartaPoder_meetingId_idx" ON "CartaPoder"("meetingId");
ALTER TABLE "CartaPoder" ADD CONSTRAINT "CartaPoder_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartaPoder" ADD CONSTRAINT "CartaPoder_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ClubMeetingAttendance
CREATE TABLE "ClubMeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "attendeeUserId" TEXT NOT NULL,
    "isDelegate" BOOLEAN NOT NULL DEFAULT false,
    "cartaPoderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubMeetingAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClubMeetingAttendance_meetingId_clubId_key" ON "ClubMeetingAttendance"("meetingId", "clubId");
CREATE INDEX "ClubMeetingAttendance_clubId_idx" ON "ClubMeetingAttendance"("clubId");
ALTER TABLE "ClubMeetingAttendance" ADD CONSTRAINT "ClubMeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeetingAttendance" ADD CONSTRAINT "ClubMeetingAttendance_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SealedVote
CREATE TABLE "SealedVote" (
    "id" TEXT NOT NULL,
    "voteSessionId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "priorityOrder" INTEGER,
    "documentUrl" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    CONSTRAINT "SealedVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SealedVote_voteSessionId_clubId_key" ON "SealedVote"("voteSessionId", "clubId");
CREATE INDEX "SealedVote_voteSessionId_idx" ON "SealedVote"("voteSessionId");
ALTER TABLE "SealedVote" ADD CONSTRAINT "SealedVote_voteSessionId_fkey" FOREIGN KEY ("voteSessionId") REFERENCES "VoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
