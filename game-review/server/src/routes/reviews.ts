import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendSQSMessage } from '../services/sqs';

const router = Router();

router.post('/games/:id/review', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { type = 'regular' } = req.body;
    
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID', code: 'INVALID_GAME_ID' });
    }

    // Validate review type
    if (!['regular', 'elite'].includes(type)) {
      return res.status(400).json({ error: 'Invalid review type. Must be regular or elite', code: 'INVALID_TYPE' });
    }

    // Map review type to model and token cost
    const model = type === 'elite' ? 'gpt-4o' : 'gpt-4o-mini';
    const tokenCost = type === 'elite' ? 2 : 1;

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
        INSERT INTO review_tasks (game_db_id, llm_model, job_state) 
        VALUES ($1, $2, 'queued') 
        RETURNING id
      `, [gameDbId, model]);

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
      console.log('Sending SQS message for task:', taskId);
      await sendSQSMessage({
        taskId,
        gameId,
        userId: gameResult.rows[0].user_id
      });
      console.log('SQS message sent successfully');

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

router.get('/reviews/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const reviewId = req.params.id;

    const client = await pool().connect();
    try {
      
      const result = await client.query(`
        SELECT r.*, g.*
        FROM reviews r
        JOIN games g ON r.game_id = g.id
        WHERE r.id = $1
      `, [reviewId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Review not found', code: 'REVIEW_NOT_FOUND' });
      }

      const review = result.rows[0];
      res.json({
        id: review.id,
        game_id: review.game_id,
        llm_model: review.llm_model,
        summary_md: review.summary_md,
        generated_at: review.generated_at,
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

export default router;