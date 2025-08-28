-- Drop the existing check constraint first
ALTER TABLE "user"
DROP CONSTRAINT IF EXISTS user_subscription_tier_check;

-- Update existing tier values
UPDATE "user"
SET subscription_tier = CASE
    WHEN subscription_tier = 'free' THEN 'applicant'
    WHEN subscription_tier = 'professional' THEN 'candidate'
    WHEN subscription_tier = 'premium' THEN 'executive'
    WHEN subscription_tier IS NULL THEN 'applicant'
    ELSE subscription_tier
END;

-- Add the new check constraint
ALTER TABLE "user"
ADD CONSTRAINT user_subscription_tier_check
CHECK (subscription_tier IN ('applicant', 'candidate', 'executive'));

-- Add usage tracking columns
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS monthly_optimizations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_ats_reports_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_job_applications INTEGER DEFAULT 0;

-- Create usage tracking table for detailed history
CREATE TABLE IF NOT EXISTS subscription_usage (
    id TEXT PRIMARY KEY DEFAULT ('su_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_feature ON subscription_usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_used_at ON subscription_usage(used_at);