import dotenv from 'dotenv';
dotenv.config();

// Import worker logger first to override console methods
import './utils/workerLogger';

import { SQS } from 'aws-sdk';
import { pool } from './db/connection';
import { getTypeForModel } from './config/models';
import { getReviewEngine } from './config/reviewEngine';

const sqs = new SQS({
  region: process.env.AWS_REGION || 'us-east-1',
});

const reviewEngine = getReviewEngine(process.env.OPENAI_API_KEY!);

const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Debug environment variables
console.log('Environment variables loaded:');
console.log('SQS_QUEUE_URL:', process.env.SQS_QUEUE_URL);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);

interface ReviewTask {
  taskId: string;
  gameId: number;
  userId: string;
  notes?: string; // Optional user notes for AI guidance
  discordUserId?: string; // Optional Discord user ID for notifications
  replayData?: Buffer; // Optional replay file data for premium reviews
}

async function processReviewTask(task: ReviewTask) {
  const client = await pool().connect();

  try {
    // Mark task as running
    await client.query(`
      UPDATE review_tasks 
      SET job_state = 'running', updated_at = NOW() 
      WHERE id = $1
    `, [task.taskId]);

    // Get review task model and type
    const taskResult = await client.query(`
      SELECT llm_model, review_type FROM review_tasks WHERE id = $1
    `, [task.taskId]);
    
    const llmModel = taskResult.rows[0]?.llm_model || 'gpt-4o-mini';
    const requestedReviewType = taskResult.rows[0]?.review_type || 'regular';
    console.log(`Processing review with model: ${llmModel} for user: ${task.userId}`);

    // Get game data with players and user's Steam/AOE4World info
    const gameResult = await client.query(`
      SELECT g.*,
             u.auth0_sub,
             i.external_id as steam_id,
             i.aoe4world_profile_id,
             i.aoe4world_username
      FROM games g
      JOIN users u ON g.user_id = u.id
      JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
      WHERE g.id = $1 AND g.user_id = $2
    `, [task.gameId, task.userId]);

    if (gameResult.rows.length === 0) {
      throw new Error('Game not found');
    }

    const gameInfo = gameResult.rows[0];
    const gameDbId = gameInfo.db_id;

    // Fetch detailed game summary for AI analysis
    let detailedGameData;
    try {
      const { fetchGameSummary } = await import('./services/aoe4world');
      detailedGameData = await fetchGameSummary(
        gameInfo.aoe4world_profile_id,
        gameInfo.steam_id,
        task.gameId.toString()
      );
      console.log(`✓ Fetched detailed game summary for AI analysis (user: ${task.userId}, game: ${task.gameId})`);
      
      // Log data quality indicators
      const hasEvents = detailedGameData?.events && Array.isArray(detailedGameData.events);
      const hasTimeline = detailedGameData?.timeline && Array.isArray(detailedGameData.timeline);
      const hasPlayerDetails = detailedGameData?.players && detailedGameData.players.length > 0;
      const hasBuildOrders = detailedGameData?.players?.some((p: any) => p.buildOrder || p.techs || p.units);
      
      console.log(`Data quality check for user ${task.userId}: events=${hasEvents}, timeline=${hasTimeline}, playerDetails=${hasPlayerDetails}, buildOrders=${hasBuildOrders}`);
      
      if (!hasEvents && !hasTimeline && !hasBuildOrders) {
        console.warn(`⚠️ Game data appears to be lobby-only (missing events, timeline, build orders) for user ${task.userId}, game ${task.gameId}`);
      }
    } catch (error) {
      console.error(`❌ fetchGameSummary failed for user ${task.userId}, game ${task.gameId}:`, error instanceof Error ? error.message : String(error));
      console.log(`📋 Falling back to basic game data from database for user ${task.userId}, game ${task.gameId}`);
      
      // Fallback to basic game data
      detailedGameData = {
        map_name: gameInfo.map_name,
        game_mode: gameInfo.game_mode,
        duration_seconds: gameInfo.duration_seconds,
        team_size: gameInfo.team_size,
        players: gameInfo.players
      };
      
      console.warn(`⚠️ Using minimal game data - review quality will be limited for user ${task.userId}, game ${task.gameId}`);
    }

    // For premium (elite) reviews, replay parsing is currently disabled
    let replayAnalysis = null;
    const actualReviewType = getTypeForModel(llmModel);
    if (actualReviewType === 'elite') {
      console.log('Elite review requested - replay parsing functionality not available');
      // Replay parsing functionality removed due to missing replay-parser service
    }

    // Generate review using ReviewEngine
    const playerName = gameInfo.aoe4world_username || 'Player';
    
    // Log review generation context
    console.log(`🤖 Generating ${actualReviewType} review for ${playerName} (user: ${task.userId}) using ${llmModel}`);
    console.log(`📊 Game data size: ${JSON.stringify(detailedGameData).length} characters for user ${task.userId}`);
    
    const review = await reviewEngine.generateReview({
      type: actualReviewType,
      playerName: playerName,
      gameData: detailedGameData,
      replayData: replayAnalysis,
      llmModel: llmModel,
      userId: task.userId,
      gameId: task.gameId.toString(),
      notes: task.notes
    });
    
    // Check if review indicates insufficient data
    const isInsufficientDataReview = review.includes('missing') || 
                                   review.includes('lobby header') || 
                                   review.includes('not enough data') ||
                                   review.includes('resend the match');
    
    if (isInsufficientDataReview) {
      console.error(`❌ LLM indicated insufficient game data in review for user ${task.userId}, game ${task.gameId}`);
    } else {
      console.log(`✅ Review generated successfully for user ${task.userId}, game ${task.gameId}`);
    }

    // Save review
    const reviewResult = await client.query(`
      INSERT INTO reviews (game_db_id, llm_model, review_type, summary_md) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id
    `, [gameDbId, llmModel, requestedReviewType, review]);

    // Update game status
    await client.query(`
      UPDATE games SET status = 'reviewed' WHERE db_id = $1
    `, [gameDbId]);

    // Mark task as completed
    await client.query(`
      UPDATE review_tasks 
      SET job_state = 'completed', updated_at = NOW() 
      WHERE id = $1
    `, [task.taskId]);

    console.log(`Review completed for user ${task.userId}, game ${task.gameId}, review ID: ${reviewResult.rows[0].id}`);

  } catch (error) {
    console.error(`Review task failed for user ${task.userId}, game ${task.gameId}:`, error);

    // Determine error type and handle appropriately
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for token limit errors
      if (error.message.includes('maximum context length') || 
          error.message.includes('tokens') && error.message.includes('exceed')) {
        errorType = 'TOKEN_LIMIT_EXCEEDED';
        console.log(`🪙 Token limit exceeded for user ${task.userId}, game ${task.gameId}: ${error.message}`);
      }
      // Check for OpenAI BadRequestError
      else if (error.name === 'BadRequestError' && error.message.includes('400')) {
        errorType = 'BAD_REQUEST';
        console.log(`🚫 OpenAI BadRequest for user ${task.userId}, game ${task.gameId}: ${error.message}`);
      }
      // Check for rate limiting
      else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorType = 'RATE_LIMITED';
        console.log(`⏰ Rate limited for user ${task.userId}, game ${task.gameId}: ${error.message}`);
      }
    }

    // Mark task as failed and increment retries
    await client.query(`
      UPDATE review_tasks 
      SET job_state = 'failed', retries = retries + 1, error = $2, error_type = $3, updated_at = NOW() 
      WHERE id = $1
    `, [task.taskId, errorMessage, errorType]);

    // Update game status back to raw if it was stuck in reviewing
    await client.query(`
      UPDATE games SET status = 'raw' WHERE db_id = (
        SELECT game_db_id FROM review_tasks WHERE id = $1
      )
    `, [task.taskId]);

    throw error;
  } finally {
    client.release();
  }
}

async function pollSQS() {
  if (!QUEUE_URL) {
    console.error('SQS_QUEUE_URL not configured');
    return;
  }

  console.log('Starting SQS polling...');
  console.log('Queue URL:', QUEUE_URL);

  while (true) {
    try {
      const params = {
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300,
      };

      const result = await sqs.receiveMessage(params).promise();

      if (result.Messages && result.Messages.length > 0) {
        const receiveTime = new Date().toISOString();
        console.log(`[${receiveTime}] Received ${result.Messages.length} messages from SQS`);
      }

      if (result.Messages) {
        for (const message of result.Messages) {
          try {
            const task: ReviewTask = JSON.parse(message.Body || '{}');
            console.log(`Processing task: ${task.taskId} for user: ${task.userId}, game: ${task.gameId}`);
            await processReviewTask(task);

            // Delete message on success
            await sqs.deleteMessage({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle!,
            }).promise();

          } catch (error) {
            console.error('Message processing failed:', error);
          }
        }
      }
    } catch (error) {
      console.error('SQS polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
// Start worker
pollSQS().catch(console.error);