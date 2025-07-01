-- Migration to allow games to be stored multiple times for different users
-- This allows the same AOE4World game to appear for multiple users who were in that match

BEGIN;

-- First, add a new auto-incrementing primary key column
ALTER TABLE games ADD COLUMN db_id BIGSERIAL;

-- Drop the existing primary key constraint
ALTER TABLE games DROP CONSTRAINT games_new_pkey;

-- Make db_id the new primary key
ALTER TABLE games ADD PRIMARY KEY (db_id);

-- Add a unique constraint on (id, user_id) to ensure no duplicate games per user
ALTER TABLE games ADD CONSTRAINT games_aoe4world_id_user_unique UNIQUE (id, user_id);

-- Update foreign key references in dependent tables to use db_id instead of id
-- But first we need to add the new column to those tables

-- Add db_id column to game_players table
ALTER TABLE game_players ADD COLUMN game_db_id BIGINT;

-- Populate the new column with existing relationships
UPDATE game_players SET game_db_id = (
    SELECT db_id FROM games WHERE games.id = game_players.game_id LIMIT 1
);

-- Make the new column NOT NULL
ALTER TABLE game_players ALTER COLUMN game_db_id SET NOT NULL;

-- Drop the old foreign key constraint
ALTER TABLE game_players DROP CONSTRAINT game_players_game_id_fkey;

-- Add new foreign key constraint
ALTER TABLE game_players ADD CONSTRAINT game_players_game_db_id_fkey 
    FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

-- Do the same for reviews table
ALTER TABLE reviews ADD COLUMN game_db_id BIGINT;

UPDATE reviews SET game_db_id = (
    SELECT db_id FROM games WHERE games.id = reviews.game_id LIMIT 1
);

ALTER TABLE reviews ALTER COLUMN game_db_id SET NOT NULL;
ALTER TABLE reviews DROP CONSTRAINT reviews_game_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_game_db_id_fkey 
    FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

-- Do the same for review_tasks table
ALTER TABLE review_tasks ADD COLUMN game_db_id BIGINT;

UPDATE review_tasks SET game_db_id = (
    SELECT db_id FROM games WHERE games.id = review_tasks.game_id LIMIT 1
);

ALTER TABLE review_tasks ALTER COLUMN game_db_id SET NOT NULL;
ALTER TABLE review_tasks DROP CONSTRAINT review_tasks_game_id_fkey;
ALTER TABLE review_tasks ADD CONSTRAINT review_tasks_game_db_id_fkey 
    FOREIGN KEY (game_db_id) REFERENCES games(db_id) ON DELETE CASCADE;

-- Update indexes
DROP INDEX idx_game_players_game_id;
CREATE INDEX idx_game_players_game_db_id ON game_players(game_db_id);

DROP INDEX idx_reviews_game_id;
CREATE INDEX idx_reviews_game_db_id ON reviews(game_db_id);

DROP INDEX idx_review_tasks_game_id;
CREATE INDEX idx_review_tasks_game_db_id ON review_tasks(game_db_id);

-- Add index on the new unique constraint
CREATE INDEX idx_games_aoe4world_id_user ON games(id, user_id);

COMMIT;