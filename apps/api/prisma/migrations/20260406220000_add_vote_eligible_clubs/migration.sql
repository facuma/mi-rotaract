-- AlterTable: VoteSession - add eligible club tracking for "papeletas digitales"
ALTER TABLE "VoteSession" ADD COLUMN "eligibleClubIds" TEXT;
ALTER TABLE "VoteSession" ADD COLUMN "eligibleClubCount" INTEGER;
