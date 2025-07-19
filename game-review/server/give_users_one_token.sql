-- Give all users with 0 tokens 1 token
-- Run this script to update users who have run out of tokens

BEGIN;

-- Show current users with 0 tokens before update
SELECT 
    COUNT(*) as users_with_zero_tokens,
    'Before update' as status
FROM users 
WHERE tokens = 0;

-- Update all users with 0 tokens to have 1 token
UPDATE users 
SET tokens = 1 
WHERE tokens = 0;

-- Show results after update
SELECT 
    COUNT(*) as users_updated,
    'After update - users now with 1 token' as status
FROM users 
WHERE tokens = 1;

-- Show total token distribution
SELECT 
    tokens,
    COUNT(*) as user_count
FROM users 
GROUP BY tokens 
ORDER BY tokens;

COMMIT;