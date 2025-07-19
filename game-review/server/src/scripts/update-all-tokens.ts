import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function updateAllTokens() {
  console.log('Updating all users to have 10 tokens...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    
    try {
      console.log('Starting transaction...');
      await client.query('BEGIN');

      // Update all users to have 10 tokens
      const result = await client.query('UPDATE users SET tokens = 10');
      console.log(`Updated ${result.rowCount} users to have 10 tokens`);

      // Show summary
      const userCount = await client.query('SELECT COUNT(*) as total FROM users');
      const tokenStats = await client.query('SELECT MIN(tokens) as min_tokens, MAX(tokens) as max_tokens, AVG(tokens) as avg_tokens FROM users');
      
      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      console.log('\n=== TOKEN UPDATE COMPLETED ===');
      console.log(`Total users: ${userCount.rows[0].total}`);
      console.log(`Min tokens: ${tokenStats.rows[0].min_tokens}`);
      console.log(`Max tokens: ${tokenStats.rows[0].max_tokens}`);
      console.log(`Avg tokens: ${parseFloat(tokenStats.rows[0].avg_tokens).toFixed(1)}`);
      
    } catch (error) {
      console.error('Error during update, rolling back...');
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating tokens:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAllTokens();