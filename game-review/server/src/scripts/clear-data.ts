import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function clearData() {
  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Start transaction
    const client = await pool.connect();
    
    try {
      console.log('Starting transaction...');
      await client.query('BEGIN');

      // Clear data in correct order (respecting foreign key constraints)
      console.log('Clearing reviews...');
      const reviewsResult = await client.query('DELETE FROM reviews');
      console.log(`Deleted ${reviewsResult.rowCount} reviews`);

      console.log('Clearing review tasks...');
      const tasksResult = await client.query('DELETE FROM review_tasks');
      console.log(`Deleted ${tasksResult.rowCount} review tasks`);

      console.log('Clearing game players...');
      const playersResult = await client.query('DELETE FROM game_players');
      console.log(`Deleted ${playersResult.rowCount} game players`);

      console.log('Clearing games...');
      const gamesResult = await client.query('DELETE FROM games');
      console.log(`Deleted ${gamesResult.rowCount} games`);

      console.log('Clearing notifications...');
      const notificationsResult = await client.query('DELETE FROM notifications');
      console.log(`Deleted ${notificationsResult.rowCount} notifications`);

      console.log('Resetting user tokens to 3...');
      const tokensResult = await client.query('UPDATE users SET tokens = 3');
      console.log(`Reset tokens for ${tokensResult.rowCount} users`);

      // Commit transaction
      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      // Show summary
      console.log('\n=== DATABASE CLEARED SUCCESSFULLY ===');
      
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const identityCount = await client.query('SELECT COUNT(*) FROM identities');
      const gameCount = await client.query('SELECT COUNT(*) FROM games');
      const reviewCount = await client.query('SELECT COUNT(*) FROM reviews');
      
      console.log(`Remaining users: ${userCount.rows[0].count}`);
      console.log(`Remaining identities: ${identityCount.rows[0].count}`);
      console.log(`Remaining games: ${gameCount.rows[0].count}`);
      console.log(`Remaining reviews: ${reviewCount.rows[0].count}`);
      
    } catch (error) {
      console.error('Error during clearing, rolling back...');
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearData();