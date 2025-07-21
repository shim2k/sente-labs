import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendSQSMessage } from '../services/sqs';
import { getModelForType, getTokenCostForType } from '../config/models';
import { fetchGameSummary } from '../services/aoe4world';

const router = Router();

// Helper function to check if game has detailed data
async function hasDetailedGameData(aoe4worldProfileId: string, steamId: string, gameId: string): Promise<boolean> {
  try {
    const gameData = await fetchGameSummary(aoe4worldProfileId, steamId, gameId);
    
    // Check for detailed game data indicators
    const hasEvents = gameData?.events && Array.isArray(gameData.events) && gameData.events.length > 0;
    const hasTimeline = gameData?.timeline && Array.isArray(gameData.timeline) && gameData.timeline.length > 0;
    const hasDetailedPlayers = gameData?.players && Array.isArray(gameData.players) &&
      gameData.players.some((p: any) => p.buildOrder || p.techs || p.units || p.apm || p.resources);
    const hasMatchEvents = gameData?.matchEvents && Array.isArray(gameData.matchEvents) && gameData.matchEvents.length > 0;
    const hasResourceData = gameData?.resourceCurves || gameData?.economyData;
    
    return hasEvents || hasTimeline || hasDetailedPlayers || hasMatchEvents || hasResourceData;
  } catch (error) {
    console.error('Error checking game data:', error);
    return false;
  }
}

router.post('/games/:id/review', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { type = 'regular', notes } = req.body;
    
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID', code: 'INVALID_GAME_ID' });
    }

    // Validate review type
    if (!['regular', 'elite'].includes(type)) {
      return res.status(400).json({ error: 'Invalid review type. Must be regular or elite', code: 'INVALID_TYPE' });
    }

    // Map review type to model and token cost
    const model = getModelForType(type);
    const tokenCost = getTokenCostForType(type);

    const client = await pool().connect();
    try {
      
      // Check if user has sufficient tokens
      const userResult = await client.query(`
        SELECT id, tokens FROM users WHERE auth0_sub = $1
      `, [req.auth?.sub]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      const user = userResult.rows[0];
      if (user.tokens < tokenCost) {
        return res.status(400).json({ 
          error: `Insufficient tokens. Need ${tokenCost} tokens for ${type === 'elite' ? 'Elite' : 'Standard'} review, but you have ${user.tokens}`,
          code: 'INSUFFICIENT_TOKENS',
          required: tokenCost,
          available: user.tokens,
          type: type
        });
      }

      // Check if game exists and belongs to user
      const gameResult = await client.query(`
        SELECT id, db_id, user_id FROM games 
        WHERE id = $1 AND user_id = $2
      `, [gameId, user.id]);

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found', code: 'GAME_NOT_FOUND' });
      }

      const gameDbId = gameResult.rows[0].db_id;

      // Check if review task already exists
      const existingTaskResult = await client.query(`
        SELECT id FROM review_tasks 
        WHERE game_db_id = $1 AND job_state IN ('queued', 'running')
      `, [gameDbId]);

      if (existingTaskResult.rows.length > 0) {
        return res.status(409).json({ error: 'Review already in progress', code: 'REVIEW_IN_PROGRESS' });
      }

      // Create review task
      const taskResult = await client.query(`
        INSERT INTO review_tasks (game_db_id, llm_model, review_type, job_state) 
        VALUES ($1, $2, $3, 'queued') 
        RETURNING id
      `, [gameDbId, model, type]);

      const taskId = taskResult.rows[0].id;

      // Deduct tokens from user
      await client.query(`
        UPDATE users SET tokens = tokens - $1 WHERE id = $2
      `, [tokenCost, user.id]);

      // Update game status to reviewing immediately
      await client.query(`
        UPDATE games SET status = 'reviewing' WHERE db_id = $1
      `, [gameDbId]);

      // Send SQS message
      const sqsSendTime = new Date().toISOString();
      console.log(`[${sqsSendTime}] Sending SQS message for task: ${taskId}, game: ${gameId}`);
      await sendSQSMessage({
        taskId,
        gameId,
        userId: gameResult.rows[0].user_id,
        notes
      });
      const sqsSentTime = new Date().toISOString();
      console.log(`[${sqsSentTime}] SQS message sent successfully for task: ${taskId} (took ${Date.now() - new Date(sqsSendTime).getTime()}ms)`);

      res.status(202).json({ taskId, message: 'Review queued' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Review request error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'REVIEW_REQUEST_ERROR' });
  }
});

router.get('/tokens', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const client = await pool().connect();
    try {
      const result = await client.query(`
        SELECT tokens FROM users WHERE auth0_sub = $1
      `, [req.auth?.sub]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      res.json({ tokens: result.rows[0].tokens });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Token fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'TOKEN_FETCH_ERROR' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const client = await pool().connect();
    try {
      const result = await client.query(`
        SELECT r.id as review_id, r.llm_model, r.review_type, r.summary_md, r.generated_at,
               g.id as game_id, g.map_name, g.game_mode, g.duration_seconds, 
               g.season, g.team_size, g.average_rating, g.average_mmr, g.played_at,
               g.players,
               COALESCE(i.aoe4world_username, i.username, u.email, 'Anonymous') as user_display_name
        FROM reviews r
        JOIN games g ON r.game_db_id = g.db_id
        JOIN users u ON g.user_id = u.id
        LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
        ORDER BY r.generated_at DESC
        LIMIT 30
      `);

      const reviews = result.rows.map(row => ({
        id: row.review_id,
        game_id: row.game_id,
        review_type: row.review_type || 'regular', // Use stored type, fallback to regular
        summary_md: row.summary_md,
        generated_at: row.generated_at,
        user_display_name: row.user_display_name,
        game: {
          id: row.game_id,
          map_name: row.map_name,
          game_mode: row.game_mode,
          duration_seconds: row.duration_seconds,
          season: row.season,
          team_size: row.team_size,
          average_rating: row.average_rating,
          average_mmr: row.average_mmr,
          played_at: row.played_at,
          players: row.players || []
        }
      }));

      res.json({ reviews });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reviews fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'REVIEWS_FETCH_ERROR' });
  }
});

router.get('/reviews/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reviewId = req.params.id;

    const client = await pool().connect();
    try {
      
      const result = await client.query(`
        SELECT r.id as review_id, r.llm_model, r.review_type, r.summary_md, r.generated_at,
               g.id as game_id, g.map_name, g.game_mode, g.duration_seconds, 
               g.season, g.team_size, g.average_rating, g.average_mmr, g.played_at, g.db_id,
               rt.job_state as current_task_state
        FROM reviews r
        JOIN games g ON r.game_db_id = g.db_id
        LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state IN ('queued', 'running')
        WHERE r.id = $1
      `, [reviewId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found', code: 'REVIEW_NOT_FOUND' });
      }

      const review = result.rows[0];
      res.json({
        id: review.review_id,
        game_id: review.game_id,
        review_type: review.review_type || 'regular', // Use stored type, fallback to regular
        summary_md: review.summary_md,
        generated_at: review.generated_at,
        is_review_in_progress: !!review.current_task_state,
        game: {
          id: review.game_id,
          map_name: review.map_name,
          game_mode: review.game_mode,
          duration_seconds: review.duration_seconds,
          season: review.season,
          team_size: review.team_size,
          average_rating: review.average_rating,
          average_mmr: review.average_mmr,
          played_at: review.played_at
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Review fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'REVIEW_FETCH_ERROR' });
  }
});

router.get('/games/:gameId/reviews', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID', code: 'INVALID_GAME_ID' });
    }

    const client = await pool().connect();
    try {
      // First check if user owns this game
      const gameResult = await client.query(`
        SELECT g.id, g.db_id FROM games g
        JOIN users u ON g.user_id = u.id
        WHERE g.id = $1 AND u.auth0_sub = $2
      `, [gameId, req.auth?.sub]);

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found or unauthorized', code: 'GAME_NOT_FOUND' });
      }

      const gameDbId = gameResult.rows[0].db_id;

      // Get all reviews for this game, ordered by generated_at DESC (newest first)
      const result = await client.query(`
        SELECT r.id as review_id, r.llm_model, r.review_type, r.summary_md, r.generated_at,
               g.id as game_id, g.map_name, g.game_mode, g.duration_seconds, 
               g.season, g.team_size, g.average_rating, g.average_mmr, g.played_at,
               rt.job_state as current_task_state
        FROM reviews r
        JOIN games g ON r.game_db_id = g.db_id
        LEFT JOIN review_tasks rt ON g.db_id = rt.game_db_id AND rt.job_state IN ('queued', 'running')
        WHERE g.db_id = $1
        ORDER BY r.generated_at DESC
      `, [gameDbId]);

      const reviews = result.rows.map(review => ({
        id: review.review_id,
        game_id: review.game_id,
        review_type: review.review_type || 'regular',
        summary_md: review.summary_md,
        generated_at: review.generated_at,
        is_review_in_progress: !!review.current_task_state,
        game: {
          id: review.game_id,
          map_name: review.map_name,
          game_mode: review.game_mode,
          duration_seconds: review.duration_seconds,
          season: review.season,
          team_size: review.team_size,
          average_rating: review.average_rating,
          average_mmr: review.average_mmr,
          played_at: review.played_at
        }
      }));

      res.json({ reviews });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Game reviews fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'GAME_REVIEWS_FETCH_ERROR' });
  }
});

router.post('/reviews/:id/rerun', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reviewId = req.params.id;
    const { type, notes } = req.body;

    const client = await pool().connect();
    try {
      // Get the review and game information
      const reviewResult = await client.query(`
        SELECT r.id as review_id, r.review_type, g.id as game_id, g.db_id, g.user_id
        FROM reviews r
        JOIN games g ON r.game_db_id = g.db_id
        WHERE r.id = $1
      `, [reviewId]);

      if (reviewResult.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found', code: 'REVIEW_NOT_FOUND' });
      }

      const review = reviewResult.rows[0];
      const gameId = review.game_id;
      const gameDbId = review.db_id;
      const reviewType = type || review.review_type || 'regular';

      // Validate review type
      if (!['regular', 'elite'].includes(reviewType)) {
        return res.status(400).json({ error: 'Invalid review type. Must be regular or elite', code: 'INVALID_TYPE' });
      }

      // Get user and check tokens
      const userResult = await client.query(`
        SELECT id, tokens FROM users WHERE auth0_sub = $1
      `, [req.auth?.sub]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      }

      const user = userResult.rows[0];
      
      // Check if the user owns this game
      if (review.user_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized to rerun this review', code: 'UNAUTHORIZED' });
      }

      const model = getModelForType(reviewType);
      const tokenCost = getTokenCostForType(reviewType);

      if (user.tokens < tokenCost) {
        return res.status(400).json({ 
          error: `Insufficient tokens. Need ${tokenCost} tokens for ${reviewType === 'elite' ? 'Elite' : 'Standard'} review, but you have ${user.tokens}`,
          code: 'INSUFFICIENT_TOKENS',
          required: tokenCost,
          available: user.tokens,
          type: reviewType
        });
      }

      // Check if review task already exists
      const existingTaskResult = await client.query(`
        SELECT id FROM review_tasks 
        WHERE game_db_id = $1 AND job_state IN ('queued', 'running')
      `, [gameDbId]);

      if (existingTaskResult.rows.length > 0) {
        return res.status(409).json({ error: 'Review already in progress', code: 'REVIEW_IN_PROGRESS' });
      }

      // Create review task
      const taskResult = await client.query(`
        INSERT INTO review_tasks (game_db_id, llm_model, review_type, job_state) 
        VALUES ($1, $2, $3, 'queued') 
        RETURNING id
      `, [gameDbId, model, reviewType]);

      const taskId = taskResult.rows[0].id;

      // Deduct tokens from user
      await client.query(`
        UPDATE users SET tokens = tokens - $1 WHERE id = $2
      `, [tokenCost, user.id]);

      // Update game status to reviewing immediately
      await client.query(`
        UPDATE games SET status = 'reviewing' WHERE db_id = $1
      `, [gameDbId]);

      // Send SQS message
      const sqsSendTime = new Date().toISOString();
      console.log(`[${sqsSendTime}] Sending SQS message for rerun task: ${taskId}, review: ${reviewId}, game: ${gameId}`);
      await sendSQSMessage({
        taskId,
        gameId,
        userId: user.id,
        notes
      });
      const sqsSentTime = new Date().toISOString();
      console.log(`[${sqsSentTime}] SQS message sent successfully for rerun task: ${taskId} (took ${Date.now() - new Date(sqsSendTime).getTime()}ms)`);

      res.status(202).json({ taskId, message: 'Review rerun queued' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Review rerun error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'REVIEW_RERUN_ERROR' });
  }
});

// New endpoint to check if game has detailed data
router.get('/games/:id/check-data', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = parseInt(req.params.id);
    
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID', code: 'INVALID_GAME_ID' });
    }

    const client = await pool().connect();
    try {
      // Get user's Steam identity and game info
      const result = await client.query(`
        SELECT g.id, g.user_id,
               i.external_id as steam_id,
               i.aoe4world_profile_id
        FROM games g
        JOIN users u ON g.user_id = u.id
        JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
        WHERE g.id = $1 AND u.auth0_sub = $2
      `, [gameId, req.auth?.sub]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found', code: 'GAME_NOT_FOUND' });
      }

      const { steam_id, aoe4world_profile_id } = result.rows[0];

      if (!aoe4world_profile_id || !steam_id) {
        return res.status(400).json({ 
          error: 'AOE4World profile not found', 
          code: 'AOE4WORLD_PROFILE_MISSING' 
        });
      }

      // Check if game has detailed data
      const hasData = await hasDetailedGameData(aoe4world_profile_id, steam_id, gameId.toString());

      res.json({ 
        hasDetailedData: hasData,
        message: hasData 
          ? 'Game data is available' 
          : 'No detailed game data found. Please enable Match History in AOE4 settings.'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Check game data error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'CHECK_DATA_ERROR' });
  }
});

export default router;