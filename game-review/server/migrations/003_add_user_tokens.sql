-- Migration: Add tokens column to users table
-- Date: 2025-06-29
-- Description: Add tokens column with default value of 3 to track review request limits

-- Add tokens column to existing users table
ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 3 NOT NULL;

-- Update existing users to have 5 tokens
UPDATE users SET tokens = 3 WHERE tokens IS NULL;

-- Create index for tokens column for efficient queries
CREATE INDEX idx_users_tokens ON users(tokens);