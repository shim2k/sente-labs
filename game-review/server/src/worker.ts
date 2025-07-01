import dotenv from 'dotenv';
dotenv.config();

// Import worker logger first to override console methods
import './utils/workerLogger';

import { SQS } from 'aws-sdk';
import { pool } from './db/connection';
import OpenAI from 'openai';
import { gzipSync } from 'zlib';

const sqs = new SQS({
  region: process.env.AWS_REGION || 'us-east-1',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Get review task model
    const taskResult = await client.query(`
      SELECT llm_model FROM review_tasks WHERE id = $1
    `, [task.taskId]);
    
    const llmModel = taskResult.rows[0]?.llm_model || 'gpt-4o-mini';
    console.log(`Processing review with model: ${llmModel}`);

    // Get game data with players and user's Steam/AOE4World info
    const gameResult = await client.query(`
      SELECT g.*,
             u.auth0_sub,
             i.external_id as steam_id,
             i.aoe4world_profile_id,
             array_agg(
               json_build_object(
                 'team_number', gp.team_number,
                 'player_name', gp.player_name,
                 'civilization', gp.civilization,
                 'result', gp.result,
                 'rating', gp.rating,
                 'mmr', gp.mmr,
                 'is_user', gp.is_user
               ) ORDER BY gp.team_number, gp.player_name
             ) as players
      FROM games g
      JOIN users u ON g.user_id = u.id
      JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
      LEFT JOIN game_players gp ON g.id = gp.game_id
      WHERE g.id = $1
      GROUP BY g.id, u.auth0_sub, i.external_id, i.aoe4world_profile_id
    `, [task.gameId]);

    if (gameResult.rows.length === 0) {
      throw new Error('Game not found');
    }

    const gameInfo = gameResult.rows[0];

    // Fetch detailed game summary for AI analysis
    let detailedGameData;
    try {
      const { fetchGameSummary } = await import('./services/aoe4world');
      detailedGameData = await fetchGameSummary(
        gameInfo.aoe4world_profile_id,
        gameInfo.steam_id,
        task.gameId.toString()
      );
      console.log('Fetched detailed game summary for AI analysis');
    } catch (error) {
      console.warn('Could not fetch detailed game summary, using basic game data:', error);
      // Fallback to basic game data
      detailedGameData = {
        map_name: gameInfo.map_name,
        game_mode: gameInfo.game_mode,
        duration_seconds: gameInfo.duration_seconds,
        team_size: gameInfo.team_size,
        players: gameInfo.players
      };
    }

    // Generate review using OpenAI with selected model
    const isPremiumReview = llmModel === 'gpt-4o';
    
    const basePrompt = `SYSTEM: You are an elite Age of Empires IV coach analyzing a match replay. 
    Provide detailed strategic analysis and split the review into sections that are relevant to the actual game data.

Focus on this player's performance: ${gameInfo.steam_id}.

Recall things that happened in the game through the review.

Make the review detailed and long but well sectioned.

Be critical of the player's performance and point out areas for improvement.

Point out interesting things that happened in the game that are relevant to the player's performance and use examples throughout your response.

Format your response as markdown with clear sections. Add emojis (in tasteful amounts) to make it more engaging.`;

    const premiumPromptAddition = isPremiumReview ? `

PREMIUM REVIEW: Provide even deeper strategic analysis including:
- Advanced tactical decision analysis
- Macro vs micro balance assessment  
- Economic efficiency optimization
- Unit composition timing analysis
- Map control and positioning insights
- Counter-strategy recommendations
- Psychological/mindset coaching tips` : '';

    const prompt = basePrompt + premiumPromptAddition + `

Game Data: ${JSON.stringify(detailedGameData)}`;

    const completion = await openai.chat.completions.create({
      model: llmModel,
      messages: [{ role: 'user', content: prompt }],
    });

    const review = completion.choices[0]?.message?.content;
    if (!review) {
      throw new Error('No review generated');
    }

    // Save review
    const reviewResult = await client.query(`
      INSERT INTO reviews (game_id, llm_model, summary_md) 
      VALUES ($1, $2, $3) 
      RETURNING id
    `, [task.gameId, llmModel, review]);

    // Update game status
    await client.query(`
      UPDATE games SET status = 'reviewed' WHERE id = $1
    `, [task.gameId]);

    // Mark task as completed
    await client.query(`
      UPDATE review_tasks 
      SET job_state = 'completed', updated_at = NOW() 
      WHERE id = $1
    `, [task.taskId]);

    console.log(`Review completed for game ${task.gameId}, review ID: ${reviewResult.rows[0].id}`);

  } catch (error) {
    console.error(`Review task failed:`, error);

    // Mark task as failed and increment retries
    await client.query(`
      UPDATE review_tasks 
      SET job_state = 'failed', retries = retries + 1, error = $2, updated_at = NOW() 
      WHERE id = $1
    `, [task.taskId, error instanceof Error ? error.message : 'Unknown error']);

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
        console.log(`Received ${result.Messages.length} messages from SQS`);
      }

      if (result.Messages) {
        for (const message of result.Messages) {
          try {
            const task: ReviewTask = JSON.parse(message.Body || '{}');
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