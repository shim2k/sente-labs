-- Migration to allow games to be stored multiple times for different users
-- This allows the same AOE4World game to appear for multiple users who were in that match

BEGIN;

-- Add a new auto-incrementing primary key column
ALTER TABLE games ADD COLUMN db_id BIGSERIAL;

-- Add a unique constraint on (id, user_id) to ensure no duplicate games per user
ALTER TABLE games ADD CONSTRAINT games_aoe4world_id_user_unique UNIQUE (id, user_id);

-- Now we need to handle the foreign key relationships
-- The issue is that our current code uses `id` (the AOE4World game_id) as foreign key
-- But we want to allow multiple games with same `id` but different `user_id`
-- So we need to change foreign keys to reference the new composite key or use db_id

-- For now, let's keep the existing foreign key structure but update the conflict resolution
-- in the application code to use (id, user_id) instead of just (id)

COMMIT;