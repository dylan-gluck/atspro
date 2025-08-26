-- Create userResume table
CREATE TABLE IF NOT EXISTS "userResume" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "contactInfo" JSONB NOT NULL,
    "summary" TEXT,
    "workExperience" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "education" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "certifications" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "skills" TEXT[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for userResume
CREATE UNIQUE INDEX IF NOT EXISTS "idx_userResume_userId" ON "userResume"("userId");
CREATE INDEX IF NOT EXISTS "idx_userResume_createdAt" ON "userResume"("createdAt");

-- Create userJobs table
CREATE TABLE IF NOT EXISTS "userJobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary" TEXT,
    "responsibilities" TEXT[],
    "qualifications" TEXT[],
    "logistics" TEXT[],
    "location" TEXT[],
    "additionalInfo" TEXT[],
    "link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'tracked' CHECK ("status" IN ('tracked', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn')),
    "notes" TEXT,
    "appliedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for userJobs
CREATE INDEX IF NOT EXISTS "idx_userJobs_userId" ON "userJobs"("userId");
CREATE INDEX IF NOT EXISTS "idx_userJobs_status" ON "userJobs"("status");
CREATE INDEX IF NOT EXISTS "idx_userJobs_createdAt" ON "userJobs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_userJobs_userId_status" ON "userJobs"("userId", "status");

-- Create jobDocuments table
CREATE TABLE IF NOT EXISTS "jobDocuments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL REFERENCES "userJobs"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('resume', 'cover', 'research', 'prep')),
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for jobDocuments
CREATE INDEX IF NOT EXISTS "idx_jobDocuments_jobId" ON "jobDocuments"("jobId");
CREATE INDEX IF NOT EXISTS "idx_jobDocuments_type" ON "jobDocuments"("type");
CREATE INDEX IF NOT EXISTS "idx_jobDocuments_jobId_type_isActive" ON "jobDocuments"("jobId", "type", "isActive");
CREATE INDEX IF NOT EXISTS "idx_jobDocuments_createdAt" ON "jobDocuments"("createdAt");

-- Create jobActivity table
CREATE TABLE IF NOT EXISTS "jobActivity" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL REFERENCES "userJobs"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('status_change', 'document_generated', 'note_added', 'applied', 'interview_scheduled', 'offer_received')),
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for jobActivity
CREATE INDEX IF NOT EXISTS "idx_jobActivity_jobId" ON "jobActivity"("jobId");
CREATE INDEX IF NOT EXISTS "idx_jobActivity_type" ON "jobActivity"("type");
CREATE INDEX IF NOT EXISTS "idx_jobActivity_createdAt" ON "jobActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_jobActivity_jobId_createdAt" ON "jobActivity"("jobId", "createdAt");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updatedAt
CREATE TRIGGER update_userResume_updated_at BEFORE UPDATE ON "userResume"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_userJobs_updated_at BEFORE UPDATE ON "userJobs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobDocuments_updated_at BEFORE UPDATE ON "jobDocuments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();