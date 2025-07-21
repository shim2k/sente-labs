import dotenv from 'dotenv';
import { pool } from '../db/connection';

// Load environment variables
dotenv.config();

async function checkStuckReview() {
  const client = await pool().connect();
  
  try {
    const gameId = 189051576;
    console.log(`=== Checking stuck review for game ID: ${gameId} ===\n`);
    
    // Check game details
    const gameQuery = `
      SELECT g.id, g.db_id, g.map_name, g.status, g.played_at, u.id as user_id, i.external_id as steam_id
      FROM games g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN identities i ON u.id = i.user_id AND i.provider = 'steam'
      WHERE g.id = $1;
    `;
    
    const gameResult = await client.query(gameQuery, [gameId]);
    
    if (gameResult.rows.length === 0) {
      console.log('❌ Game not found');
      return;
    }
    
    const game = gameResult.rows[0];
    console.log('📋 Game Details:');
    console.log(`   Game ID: ${game.id}`);
    console.log(`   DB ID: ${game.db_id}`);
    console.log(`   Map: ${game.map_name}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Played: ${game.played_at}`);
    console.log(`   User ID: ${game.user_id}`);
    console.log(`   Steam ID: ${game.steam_id}\n`);
    
    // Check for review tasks
    const tasksQuery = `
      SELECT id, game_db_id, llm_model, review_type, job_state, created_at, updated_at
      FROM review_tasks
      WHERE game_db_id = $1
      ORDER BY created_at DESC;
    `;
    
    const tasksResult = await client.query(tasksQuery, [game.db_id]);
    
    console.log(`🔄 Review Tasks (${tasksResult.rows.length}):`);
    if (tasksResult.rows.length === 0) {
      console.log('   No review tasks found');
    } else {
      tasksResult.rows.forEach((task, index) => {
        console.log(`   ${index + 1}. Task ID: ${task.id}`);
        console.log(`      State: ${task.job_state}`);
        console.log(`      Type: ${task.review_type}`);
        console.log(`      Model: ${task.llm_model}`);
        console.log(`      Created: ${task.created_at}`);
        console.log(`      Updated: ${task.updated_at}`);
        console.log('');
      });
    }
    
    // Check for existing reviews
    const reviewsQuery = `
      SELECT id, review_type, summary_md, generated_at
      FROM reviews
      WHERE game_db_id = $1
      ORDER BY generated_at DESC;
    `;
    
    const reviewsResult = await client.query(reviewsQuery, [game.db_id]);
    
    console.log(`📝 Existing Reviews (${reviewsResult.rows.length}):`);
    if (reviewsResult.rows.length === 0) {
      console.log('   No reviews found');
    } else {
      reviewsResult.rows.forEach((review, index) => {
        console.log(`   ${index + 1}. Review ID: ${review.id}`);
        console.log(`      Type: ${review.review_type}`);
        console.log(`      Generated: ${review.generated_at}`);
        console.log(`      Summary length: ${review.summary_md?.length || 0} chars`);
        console.log('');
      });
    }
    
    // Look for stuck tasks (queued/running for more than 10 minutes)
    const stuckTasksQuery = `
      SELECT id, job_state, created_at, 
             EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
      FROM review_tasks
      WHERE game_db_id = $1
        AND job_state IN ('queued', 'running')
        AND created_at < NOW() - INTERVAL '10 minutes';
    `;
    
    const stuckTasksResult = await client.query(stuckTasksQuery, [game.db_id]);
    
    if (stuckTasksResult.rows.length > 0) {
      console.log('⚠️  STUCK TASKS DETECTED:');
      stuckTasksResult.rows.forEach(task => {
        console.log(`   Task ID: ${task.id} | State: ${task.job_state} | ${Math.round(task.minutes_ago)} minutes ago`);
      });
      
      console.log('\n🔧 FIXING STUCK TASKS...');
      
      // Update stuck tasks to failed
      const fixQuery = `
        UPDATE review_tasks 
        SET job_state = 'failed', updated_at = NOW()
        WHERE game_db_id = $1
          AND job_state IN ('queued', 'running')
          AND created_at < NOW() - INTERVAL '10 minutes'
        RETURNING id;
      `;
      
      const fixResult = await client.query(fixQuery, [game.db_id]);
      
      console.log(`✅ Updated ${fixResult.rows.length} stuck tasks to 'failed'`);
      
      // Update game status back to raw if it was stuck in reviewing
      if (game.status === 'reviewing') {
        const updateGameQuery = `
          UPDATE games 
          SET status = 'raw'
          WHERE db_id = $1
          RETURNING id;
        `;
        
        await client.query(updateGameQuery, [game.db_id]);
        console.log(`✅ Updated game status from 'reviewing' to 'raw'`);
      }
    } else {
      console.log('✅ No stuck tasks found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool().end();
  }
}

// Run the script
checkStuckReview()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });