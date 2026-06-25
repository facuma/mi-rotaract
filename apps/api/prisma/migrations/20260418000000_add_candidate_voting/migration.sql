-- Desempate RDR (Art. 49) + elecciones multi-candidato (Art. 61-66).
--
-- Extiende el subsistema de votación para soportar papeletas con candidatos
-- nombrados y segunda vuelta. Mantiene backward-compat: toda sesión existente
-- queda con ballotType=YES_NO, round=1, sin candidatos.

-- 1. Enum nuevo BallotType
CREATE TYPE "BallotType" AS ENUM ('YES_NO', 'CANDIDATE');

-- 2. Columnas nuevas en VoteSession
ALTER TABLE "VoteSession"
  ADD COLUMN "ballotType" "BallotType" NOT NULL DEFAULT 'YES_NO',
  ADD COLUMN "round" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousSessionId" TEXT,
  ADD COLUMN "rdrTiebreakerCandidateId" TEXT;

-- FK self-referencial para la cadena de rondas (segunda vuelta y posteriores)
ALTER TABLE "VoteSession"
  ADD CONSTRAINT "VoteSession_previousSessionId_fkey"
  FOREIGN KEY ("previousSessionId") REFERENCES "VoteSession"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX "VoteSession_previousSessionId_idx" ON "VoteSession"("previousSessionId");

-- 3. Tabla VoteCandidate
CREATE TABLE "VoteCandidate" (
  "id"            TEXT        NOT NULL,
  "voteSessionId" TEXT        NOT NULL,
  "displayName"   TEXT        NOT NULL,
  "userId"        TEXT,
  "order"         INTEGER     NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoteCandidate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VoteCandidate"
  ADD CONSTRAINT "VoteCandidate_voteSessionId_fkey"
  FOREIGN KEY ("voteSessionId") REFERENCES "VoteSession"(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "VoteCandidate_voteSessionId_idx" ON "VoteCandidate"("voteSessionId");

-- 4. Columna nueva en Vote (candidateId nullable)
ALTER TABLE "Vote" ADD COLUMN "candidateId" TEXT;

ALTER TABLE "Vote"
  ADD CONSTRAINT "Vote_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "VoteCandidate"(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX "Vote_candidateId_idx" ON "Vote"("candidateId");

-- 5. Nuevos valores del enum NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VOTE_TIE_DETECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VOTE_TIEBREAKER_APPLIED';
