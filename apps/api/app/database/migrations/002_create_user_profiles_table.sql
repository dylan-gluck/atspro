-- Migration 002: Create user profiles table
-- ATSPro API - User profile data storage

-- User profile table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY, -- References better-auth user.id
    phone VARCHAR(20),
    location VARCHAR(255),
    title VARCHAR(255),
    bio TEXT,
    resume_id TEXT, -- Tracks onboarding completion - references resume stored in ArangoDB
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on profile updates
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile data including contact info and onboarding status';
COMMENT ON COLUMN user_profiles.user_id IS 'References better-auth user.id (primary key)';
COMMENT ON COLUMN user_profiles.phone IS 'Optional phone number';
COMMENT ON COLUMN user_profiles.location IS 'Optional location/address';
COMMENT ON COLUMN user_profiles.title IS 'Optional professional title';
COMMENT ON COLUMN user_profiles.bio IS 'Optional biography/summary';
COMMENT ON COLUMN user_profiles.resume_id IS 'Resume ID indicating onboarding completion';
COMMENT ON COLUMN user_profiles.created_at IS 'Profile creation timestamp';
COMMENT ON COLUMN user_profiles.updated_at IS 'Profile last update timestamp';