-- AlterTable
-- Default 'fs' so existing attachments (stored in filesystem) get correct backend
ALTER TABLE "Attachment" ADD COLUMN "storageBackend" TEXT NOT NULL DEFAULT 'fs';

-- Set default to 'r2' for future inserts (application may override explicitly)
ALTER TABLE "Attachment" ALTER COLUMN "storageBackend" SET DEFAULT 'r2';
