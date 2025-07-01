-- Fix the games table to allow the same game for multiple users
-- This requires handling foreign key dependencies

BEGIN;

-- Add winning_team and winner_names columns if they don't exist
ALTER TABLE games ADD COLUMN IF NOT EXISTS winning_team INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_names TEXT[];

-- Check if we already have the composite unique constraint
DO $$
BEGIN
    -- Only add the constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'games_aoe4world_id_user_unique'
    ) THEN
        ALTER TABLE games ADD CONSTRAINT games_aoe4world_id_user_unique UNIQUE (id, user_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_winning_team ON games(winning_team);

COMMIT;