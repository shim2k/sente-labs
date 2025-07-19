-- Query to analyze token usage by users with Steam/AOE4 profiles connected

-- Summary of token usage by connected users
WITH user_token_usage AS (
  SELECT 
    u.id,
    u.auth0_sub,
    u.email,
    u.tokens as current_tokens,
    u.created_at as user_created_at,
    i.username as steam_username,
    i.aoe4world_username,
    i.aoe4world_profile_id,
    i.created_at as steam_connected_at,
    -- Calculate tokens used (assuming users start with 3 tokens)
    (3 - u.tokens) as tokens_used,
    -- Count reviews per user
    COUNT(DISTINCT r.id) as total_reviews,
    -- Count review types
    COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) as standard_reviews,
    COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) as elite_reviews,
    -- Calculate total tokens spent (1 for standard, 3 for elite)
    (COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) * 1 +
     COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) * 3) as calculated_tokens_spent
  FROM users u
  INNER JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN reviews r ON g.db_id = r.game_db_id
  LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state = 'completed'
  GROUP BY u.id, u.auth0_sub, u.email, u.tokens, u.created_at, 
           i.username, i.aoe4world_username, i.aoe4world_profile_id, i.created_at
)
SELECT 
  aoe4world_username,
  steam_username,
  email,
  current_tokens,
  tokens_used,
  total_reviews,
  standard_reviews,
  elite_reviews,
  calculated_tokens_spent,
  user_created_at,
  steam_connected_at
FROM user_token_usage
ORDER BY tokens_used DESC, total_reviews DESC;

-- Aggregate statistics
SELECT 
  COUNT(DISTINCT u.id) as total_connected_users,
  SUM(3 - u.tokens) as total_tokens_used,
  AVG(3 - u.tokens) as avg_tokens_per_user,
  COUNT(DISTINCT r.id) as total_reviews_created,
  COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) as total_standard_reviews,
  COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) as total_elite_reviews,
  MIN(u.tokens) as min_tokens_remaining,
  MAX(u.tokens) as max_tokens_remaining,
  COUNT(DISTINCT CASE WHEN u.tokens = 0 THEN u.id END) as users_with_zero_tokens,
  COUNT(DISTINCT CASE WHEN u.tokens > 0 THEN u.id END) as users_with_tokens_remaining
FROM users u
INNER JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN reviews r ON g.db_id = r.game_db_id
LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state = 'completed';

-- Token usage distribution
SELECT 
  u.tokens as tokens_remaining,
  COUNT(DISTINCT u.id) as user_count,
  STRING_AGG(COALESCE(i.aoe4world_username, i.username, u.email), ', ' ORDER BY i.aoe4world_username) as users
FROM users u
INNER JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
GROUP BY u.tokens
ORDER BY u.tokens ASC;

-- Users who have used all their tokens
SELECT 
  COALESCE(i.aoe4world_username, i.username, u.email) as user_display,
  u.tokens as tokens_remaining,
  COUNT(DISTINCT r.id) as reviews_created,
  MAX(r.generated_at) as last_review_date
FROM users u
INNER JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN reviews r ON g.db_id = r.game_db_id
WHERE u.tokens = 0
GROUP BY u.id, u.tokens, i.aoe4world_username, i.username, u.email
ORDER BY reviews_created DESC;