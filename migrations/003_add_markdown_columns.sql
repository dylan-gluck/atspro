-- Add markdown columns to jobDocuments table for proper storage
ALTER TABLE "jobDocuments" 
ADD COLUMN IF NOT EXISTS "contentMarkdown" TEXT,
ADD COLUMN IF NOT EXISTS "atsScore" INTEGER;

-- Update existing documents to move markdown from metadata to dedicated column
UPDATE "jobDocuments"
SET "contentMarkdown" = metadata->>'markdown',
    "atsScore" = (metadata->>'atsScore')::INTEGER
WHERE metadata->>'markdown' IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_job_documents_ats_score ON "jobDocuments"("atsScore") WHERE "atsScore" IS NOT NULL;