-- AlterTable
ALTER TABLE "CartaPoder" ALTER COLUMN "secretarySignedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "submittedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VoteSession" ADD COLUMN     "electionType" TEXT;
