-- Create user settings table
CREATE TABLE IF NOT EXISTS "userSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "applicationUpdates" BOOLEAN NOT NULL DEFAULT true,
  "weeklyReports" BOOLEAN NOT NULL DEFAULT false,
  "jobRecommendations" BOOLEAN NOT NULL DEFAULT true,
  "resumeTips" BOOLEAN NOT NULL DEFAULT true,
  "defaultJobStatus" TEXT NOT NULL DEFAULT 'saved',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "idx_userSettings_userId" ON "userSettings" ("userId");
CREATE INDEX IF NOT EXISTS "idx_userSettings_createdAt" ON "userSettings" ("createdAt");

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON "userSettings"
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_updated_at();