-- Migration: Fix primary key to use db_id instead of AOE4World game id
-- This allows multiple users to have the same AOE4World game

BEGIN;

-- Step 1: Drop foreign key constraints
ALTER TABLE game_players DROP CONSTRAINT IF EXISTS game_players_game_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_game_id_fkey;
ALTER TABLE review_tasks DROP CONSTRAINT IF EXISTS review_tasks_game_id_fkey;

-- Step 2: Add db_id columns to child tables and populate them
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS game_db_id bigint;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS game_db_id bigint;
ALTER TABLE review_tasks ADD COLUMN IF NOT EXISTS game_db_id bigint;

-- Populate the new columns
UPDATE game_players SET game_db_id = (SELECT db_id FROM games WHERE games.id = game_players.game_id);
UPDATE reviews SET game_db_id = (SELECT db_id FROM games WHERE games.id = reviews.game_id);
UPDATE review_tasks SET game_db_id = (SELECT db_id FROM games WHERE games.id = review_tasks.game_id);

-- Step 3: Drop the old primary key constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_new_pkey;

-- Step 4: Make db_id the primary key
ALTER TABLE games ADD CONSTRAINT games_pkey PRIMARY KEY (db_id);

-- Step 5: Remove the composite unique constraint since we'll use application logic instead
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_aoe4world_id_user_unique;

-- Step 6: Add the new foreign key constraints
ALTER TABLE game_players 
  ADD CONSTRAINT game_players_game_db_id_fkey 
  FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

ALTER TABLE reviews 
  ADD CONSTRAINT reviews_game_db_id_fkey 
  FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

ALTER TABLE review_tasks 
  ADD CONSTRAINT review_tasks_game_db_id_fkey 
  FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_id_user ON games(id, user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);

COMMIT;