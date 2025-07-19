-- Migration to update default tokens from 3 to 2 for new users
-- Date: 2025-07-16

-- Update the default value for the tokens column
ALTER TABLE users ALTER COLUMN tokens SET DEFAULT 2;

-- This change only affects new users created after this migration
-- Existing users will keep their current token balance