-- Clear reviews and games data
-- This will preserve users and identities but remove all game and review data

-- Start transaction
BEGIN;

-- Clear all reviews first (they reference games)
DELETE FROM reviews;

-- Clear all review tasks (they reference games)
DELETE FROM review_tasks;

-- Clear all game players (they reference games)
DELETE FROM game_players;

-- Clear all games
DELETE FROM games;

-- Clear notifications (optional - they might reference reviews/games)
DELETE FROM notifications;

-- Reset tokens for all users back to default
UPDATE users SET tokens = 5;

-- Commit transaction
COMMIT;

-- Display summary
SELECT 'Database cleared successfully' as status;
SELECT COUNT(*) as remaining_users FROM users;
SELECT COUNT(*) as remaining_identities FROM identities;
SELECT COUNT(*) as remaining_games FROM games;
SELECT COUNT(*) as remaining_reviews FROM reviews;
EOF < /dev/null