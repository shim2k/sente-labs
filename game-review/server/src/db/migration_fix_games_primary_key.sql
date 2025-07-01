-- Fix the games table to allow the same game for multiple users

BEGIN;

-- First, drop the existing primary key constraint
ALTER TABLE games DROP CONSTRAINT games_new_pkey;

-- Add winning_team and winner_names columns if they don't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS winning_team INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_names TEXT[];

-- Create a new primary key on (id, user_id)
ALTER TABLE games ADD PRIMARY KEY (id, user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_winning_team ON games(winning_team);

COMMIT;