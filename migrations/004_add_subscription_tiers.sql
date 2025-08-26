-- Add subscription tier to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'professional', 'premium'));

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS monthly_credits_used INTEGER DEFAULT 0;

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS monthly_credits_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY DEFAULT ('rl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscription_tier ON "user"(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_subscription_expires ON "user"(subscription_expires_at);