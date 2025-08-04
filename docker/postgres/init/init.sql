-- -- Initialize ATSPro database
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- Create basic tables for user management
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     email VARCHAR(255) UNIQUE NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- -- Create sessions table for BetterAuth
-- CREATE TABLE IF NOT EXISTS sessions (
--     id VARCHAR(255) PRIMARY KEY,
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- -- Create accounts table for OAuth
-- CREATE TABLE IF NOT EXISTS accounts (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     provider VARCHAR(50) NOT NULL,
--     provider_account_id VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     UNIQUE(provider, provider_account_id)
-- );

-- -- Create indexes
-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
-- CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
-- CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);
