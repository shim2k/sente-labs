-- ========================================
-- COMPREHENSIVE ANALYTICS DASHBOARD
-- ========================================

-- Table 1: User Token Usage Analysis
-- ========================================
\echo '=== USER TOKEN USAGE ANALYSIS ==='
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
    -- Calculate tokens used (assuming users start with 2 tokens now)
    (2 - u.tokens) as tokens_used,
    -- Count reviews per user
    COUNT(DISTINCT r.id) as total_reviews,
    -- Count review types
    COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) as standard_reviews,
    COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) as elite_reviews,
    -- Calculate total tokens spent (1 for standard, 2 for elite)
    (COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) * 1 +
     COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) * 2) as calculated_tokens_spent
  FROM users u
  LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN reviews r ON g.db_id = r.game_db_id
  LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state = 'completed'
  GROUP BY u.id, u.auth0_sub, u.email, u.tokens, u.created_at, 
           i.username, i.aoe4world_username, i.aoe4world_profile_id, i.created_at
)
SELECT 
  COALESCE(aoe4world_username, steam_username, email, 'Anonymous') as user_display,
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

-- Table 2: Overall Platform Statistics
-- ========================================
\echo ''
\echo '=== OVERALL PLATFORM STATISTICS ==='
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN u.id END) as users_with_linked_accounts,
  COUNT(DISTINCT CASE WHEN i.id IS NULL THEN u.id END) as users_without_linked_accounts,
  SUM(GREATEST(0, 2 - u.tokens)) as total_tokens_used,
  AVG(GREATEST(0, 2 - u.tokens)) as avg_tokens_per_user,
  COUNT(DISTINCT r.id) as total_reviews_created,
  COUNT(DISTINCT rt.id) as total_review_tasks,
  COUNT(DISTINCT CASE WHEN rt.llm_model = 'gpt-4o' THEN rt.id END) as total_standard_reviews,
  COUNT(DISTINCT CASE WHEN rt.llm_model = 'o3' THEN rt.id END) as total_elite_reviews,
  MIN(u.tokens) as min_tokens_remaining,
  MAX(u.tokens) as max_tokens_remaining,
  COUNT(DISTINCT CASE WHEN u.tokens = 0 THEN u.id END) as users_with_zero_tokens,
  COUNT(DISTINCT CASE WHEN u.tokens > 0 THEN u.id END) as users_with_tokens_remaining,
  COUNT(DISTINCT g.id) as total_games_uploaded
FROM users u
LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN reviews r ON g.db_id = r.game_db_id
LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state = 'completed';

-- Table 3: Token Distribution Analysis
-- ========================================
\echo ''
\echo '=== TOKEN DISTRIBUTION ANALYSIS ==='
SELECT 
  u.tokens as tokens_remaining,
  COUNT(DISTINCT u.id) as user_count,
  ROUND(COUNT(DISTINCT u.id) * 100.0 / SUM(COUNT(DISTINCT u.id)) OVER (), 2) as percentage,
  STRING_AGG(COALESCE(i.aoe4world_username, i.username, u.email, 'Anonymous'), ', ' ORDER BY COALESCE(i.aoe4world_username, i.username, u.email)) as users
FROM users u
LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
GROUP BY u.tokens
ORDER BY u.tokens ASC;

-- Table 4: Users at Risk (Zero Tokens)
-- ========================================
\echo ''
\echo '=== USERS AT RISK (ZERO TOKENS) ==='
SELECT 
  COALESCE(i.aoe4world_username, i.username, u.email, 'Anonymous') as user_display,
  u.tokens as tokens_remaining,
  COUNT(DISTINCT r.id) as reviews_created,
  COUNT(DISTINCT g.id) as games_uploaded,
  MAX(r.generated_at) as last_review_date,
  u.created_at as user_joined_date,
  EXTRACT(DAYS FROM NOW() - u.created_at) as days_since_joined
FROM users u
LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN reviews r ON g.db_id = r.game_db_id
WHERE u.tokens = 0
GROUP BY u.id, u.tokens, i.aoe4world_username, i.username, u.email, u.created_at
ORDER BY reviews_created DESC, days_since_joined DESC;

-- Table 5: Game Upload and Review Activity
-- ========================================
\echo ''
\echo '=== GAME UPLOAD AND REVIEW ACTIVITY ==='
SELECT 
  COALESCE(i.aoe4world_username, i.username, u.email, 'Anonymous') as user_display,
  COUNT(DISTINCT g.id) as games_uploaded,
  COUNT(DISTINCT r.id) as reviews_created,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT g.id) > 0 
      THEN COUNT(DISTINCT r.id) * 100.0 / COUNT(DISTINCT g.id)
      ELSE 0 
    END, 2
  ) as review_rate_percentage,
  MIN(g.uploaded_at) as first_game_upload,
  MAX(g.uploaded_at) as last_game_upload,
  MAX(r.generated_at) as last_review_generated
FROM users u
LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
LEFT JOIN games g ON u.id = g.user_id
LEFT JOIN reviews r ON g.db_id = r.game_db_id
WHERE EXISTS (SELECT 1 FROM games WHERE user_id = u.id)
GROUP BY u.id, i.aoe4world_username, i.username, u.email
ORDER BY games_uploaded DESC, reviews_created DESC;

-- Table 6: Review Model Preferences
-- ========================================
\echo ''
\echo '=== REVIEW MODEL PREFERENCES ==='
SELECT 
  rt.llm_model,
  COUNT(DISTINCT rt.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN rt.job_state = 'completed' THEN rt.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN rt.job_state = 'failed' THEN rt.id END) as failed_tasks,
  COUNT(DISTINCT CASE WHEN rt.job_state = 'pending' THEN rt.id END) as pending_tasks,
  ROUND(
    COUNT(DISTINCT CASE WHEN rt.job_state = 'completed' THEN rt.id END) * 100.0 / 
    NULLIF(COUNT(DISTINCT rt.id), 0), 2
  ) as success_rate_percentage,
  AVG(EXTRACT(EPOCH FROM (rt.completed_at - rt.created_at))) as avg_processing_time_seconds
FROM review_tasks rt
GROUP BY rt.llm_model
ORDER BY total_tasks DESC;

-- Table 7: Daily Activity Trends (Last 30 Days)
-- ========================================
\echo ''
\echo '=== DAILY ACTIVITY TRENDS (LAST 30 DAYS) ==='
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as activity_date,
    'User Registration' as activity_type,
    COUNT(*) as count
  FROM users 
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  
  UNION ALL
  
  SELECT 
    DATE(uploaded_at) as activity_date,
    'Game Upload' as activity_type,
    COUNT(*) as count
  FROM games 
  WHERE uploaded_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(uploaded_at)
  
  UNION ALL
  
  SELECT 
    DATE(generated_at) as activity_date,
    'Review Generated' as activity_type,
    COUNT(*) as count
  FROM reviews 
  WHERE generated_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(generated_at)
)
SELECT 
  activity_date,
  SUM(CASE WHEN activity_type = 'User Registration' THEN count ELSE 0 END) as new_users,
  SUM(CASE WHEN activity_type = 'Game Upload' THEN count ELSE 0 END) as games_uploaded,
  SUM(CASE WHEN activity_type = 'Review Generated' THEN count ELSE 0 END) as reviews_generated
FROM daily_stats
GROUP BY activity_date
ORDER BY activity_date DESC
LIMIT 30;

-- Table 8: Popular Game Modes and Maps
-- ========================================
\echo ''
\echo '=== POPULAR GAME MODES AND MAPS ==='
SELECT 
  g.game_mode,
  g.team_size,
  COUNT(DISTINCT g.id) as games_count,
  COUNT(DISTINCT r.id) as reviews_count,
  ROUND(COUNT(DISTINCT r.id) * 100.0 / NULLIF(COUNT(DISTINCT g.id), 0), 2) as review_rate,
  AVG(g.duration_seconds) as avg_duration_seconds,
  AVG(g.average_rating) as avg_player_rating
FROM games g
LEFT JOIN reviews r ON g.db_id = r.game_db_id
GROUP BY g.game_mode, g.team_size
ORDER BY games_count DESC
LIMIT 10;

\echo ''
\echo '=== TOP 10 MOST POPULAR MAPS ==='
SELECT 
  g.map_name,
  COUNT(DISTINCT g.id) as games_count,
  COUNT(DISTINCT r.id) as reviews_count,
  ROUND(COUNT(DISTINCT r.id) * 100.0 / NULLIF(COUNT(DISTINCT g.id), 0), 2) as review_rate,
  AVG(g.duration_seconds) as avg_duration_seconds
FROM games g
LEFT JOIN reviews r ON g.db_id = r.game_db_id
WHERE g.map_name IS NOT NULL
GROUP BY g.map_name
ORDER BY games_count DESC
LIMIT 10;

-- Table 9: User Engagement Segments
-- ========================================
\echo ''
\echo '=== USER ENGAGEMENT SEGMENTS ==='
WITH user_engagement AS (
  SELECT 
    u.id,
    COALESCE(i.aoe4world_username, i.username, u.email, 'Anonymous') as user_display,
    COUNT(DISTINCT g.id) as games_uploaded,
    COUNT(DISTINCT r.id) as reviews_created,
    u.tokens as current_tokens,
    EXTRACT(DAYS FROM NOW() - u.created_at) as days_since_joined,
    CASE 
      WHEN COUNT(DISTINCT r.id) >= 5 THEN 'Power User'
      WHEN COUNT(DISTINCT r.id) >= 2 THEN 'Active User'
      WHEN COUNT(DISTINCT r.id) = 1 THEN 'New User'
      WHEN COUNT(DISTINCT g.id) > 0 THEN 'Game Uploader'
      ELSE 'Inactive User'
    END as engagement_segment
  FROM users u
  LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN reviews r ON g.db_id = r.game_db_id
  GROUP BY u.id, i.aoe4world_username, i.username, u.email, u.tokens, u.created_at
)
SELECT 
  engagement_segment,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  AVG(games_uploaded) as avg_games_uploaded,
  AVG(reviews_created) as avg_reviews_created,
  AVG(current_tokens) as avg_tokens_remaining,
  AVG(days_since_joined) as avg_days_since_joined
FROM user_engagement
GROUP BY engagement_segment
ORDER BY 
  CASE engagement_segment
    WHEN 'Power User' THEN 1
    WHEN 'Active User' THEN 2
    WHEN 'New User' THEN 3
    WHEN 'Game Uploader' THEN 4
    WHEN 'Inactive User' THEN 5
  END;

-- Table 10: Token Economy Health
-- ========================================
\echo ''
\echo '=== TOKEN ECONOMY HEALTH ==='
WITH token_economy AS (
  SELECT 
    COUNT(DISTINCT u.id) as total_users,
    SUM(u.tokens) as total_tokens_in_circulation,
    SUM(GREATEST(0, 2 - u.tokens)) as total_tokens_consumed,
    COUNT(DISTINCT CASE WHEN u.tokens = 0 THEN u.id END) as depleted_users,
    COUNT(DISTINCT rt.id) as total_review_tasks,
    SUM(CASE WHEN rt.llm_model = 'gpt-4o' THEN 1 ELSE 0 END) as standard_review_tokens_spent,
    SUM(CASE WHEN rt.llm_model = 'o3' THEN 2 ELSE 0 END) as elite_review_tokens_spent
  FROM users u
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state = 'completed'
)
SELECT 
  total_users,
  total_tokens_in_circulation,
  total_tokens_consumed,
  (total_tokens_in_circulation + total_tokens_consumed) as total_tokens_issued,
  ROUND(depleted_users * 100.0 / NULLIF(total_users, 0), 2) as user_depletion_rate_percentage,
  total_review_tasks,
  standard_review_tokens_spent,
  elite_review_tokens_spent,
  (standard_review_tokens_spent + elite_review_tokens_spent) as calculated_tokens_spent,
  ROUND((standard_review_tokens_spent + elite_review_tokens_spent) * 100.0 / 
        NULLIF(total_tokens_consumed, 0), 2) as token_calculation_accuracy_percentage
FROM token_economy;

-- Table 11: User Profile Linking and Review Creation Analysis
-- ========================================
\echo ''
\echo '=== USER PROFILE LINKING AND REVIEW CREATION ANALYSIS ==='
WITH user_profile_analysis AS (
  SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    -- Profile linking status
    CASE WHEN i.id IS NOT NULL THEN 'Linked' ELSE 'Not Linked' END as profile_linked_status,
    i.provider as linked_provider,
    i.username as steam_username,
    i.aoe4world_username,
    i.aoe4world_profile_id,
    -- Review creation status
    COUNT(DISTINCT r.id) as reviews_created,
    CASE WHEN COUNT(DISTINCT r.id) > 0 THEN 'Has Reviews' ELSE 'No Reviews' END as review_creation_status,
    -- Games uploaded
    COUNT(DISTINCT g.id) as games_uploaded,
    -- Token information
    u.tokens as current_tokens,
    (2 - u.tokens) as tokens_used
  FROM users u
  LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN reviews r ON g.id = r.game_id
  GROUP BY u.id, u.email, u.created_at, i.id, i.provider, i.username, i.aoe4world_username, i.aoe4world_profile_id, u.tokens
)
SELECT 
  profile_linked_status,
  review_creation_status,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage_of_total,
  AVG(reviews_created) as avg_reviews_per_user,
  AVG(games_uploaded) as avg_games_per_user,
  AVG(tokens_used) as avg_tokens_used,
  AVG(current_tokens) as avg_tokens_remaining,
  COUNT(CASE WHEN aoe4world_profile_id IS NOT NULL THEN 1 END) as users_with_aoe4world_profile,
  COUNT(CASE WHEN steam_username IS NOT NULL THEN 1 END) as users_with_steam_username
FROM user_profile_analysis
GROUP BY profile_linked_status, review_creation_status
ORDER BY 
  CASE profile_linked_status WHEN 'Linked' THEN 1 ELSE 2 END,
  CASE review_creation_status WHEN 'Has Reviews' THEN 1 ELSE 2 END;

\echo ''
\echo '=== PROFILE LINKING SUMMARY ==='
WITH profile_summary AS (
  SELECT 
    u.id,
    CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END as has_linked_profile,
    CASE WHEN i.aoe4world_profile_id IS NOT NULL THEN 1 ELSE 0 END as has_aoe4world_profile,
    CASE WHEN i.username IS NOT NULL THEN 1 ELSE 0 END as has_steam_username,
    CASE WHEN COUNT(DISTINCT r.id) > 0 THEN 1 ELSE 0 END as has_created_reviews
  FROM users u
  LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
  LEFT JOIN games g ON u.id = g.user_id
  LEFT JOIN reviews r ON g.id = r.game_id
  GROUP BY u.id, i.id, i.aoe4world_profile_id, i.username
)
SELECT 
  'Total Users' as metric,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / COUNT(*), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Users with Steam/AOE4World Profile Linked' as metric,
  SUM(has_linked_profile) as count,
  ROUND(SUM(has_linked_profile) * 100.0 / COUNT(*), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Users with AOE4World Profile ID' as metric,
  SUM(has_aoe4world_profile) as count,
  ROUND(SUM(has_aoe4world_profile) * 100.0 / COUNT(*), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Users with Steam Username' as metric,
  SUM(has_steam_username) as count,
  ROUND(SUM(has_steam_username) * 100.0 / COUNT(*), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Users Who Created Reviews' as metric,
  SUM(has_created_reviews) as count,
  ROUND(SUM(has_created_reviews) * 100.0 / COUNT(*), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Linked Users Who Created Reviews' as metric,
  SUM(CASE WHEN has_linked_profile = 1 AND has_created_reviews = 1 THEN 1 ELSE 0 END) as count,
  ROUND(SUM(CASE WHEN has_linked_profile = 1 AND has_created_reviews = 1 THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(has_linked_profile), 0), 2) as percentage
FROM profile_summary

UNION ALL

SELECT 
  'Non-Linked Users Who Created Reviews' as metric,
  SUM(CASE WHEN has_linked_profile = 0 AND has_created_reviews = 1 THEN 1 ELSE 0 END) as count,
  ROUND(SUM(CASE WHEN has_linked_profile = 0 AND has_created_reviews = 1 THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(CASE WHEN has_linked_profile = 0 THEN 1 ELSE 0 END), 0), 2) as percentage
FROM profile_summary;

\echo ''
\echo '=== ANALYTICS DASHBOARD COMPLETE ==='