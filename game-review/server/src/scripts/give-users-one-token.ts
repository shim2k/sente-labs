import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function giveUsersOneToken() {
  console.log('Giving all users with 0 tokens 1 token...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    
    try {
      console.log('Starting transaction...');
      await client.query('BEGIN');

      // First, check how many users have 0 tokens
      const zeroTokensResult = await client.query('SELECT COUNT(*) as count FROM users WHERE tokens = 0');
      const usersWithZeroTokens = parseInt(zeroTokensResult.rows[0].count);
      console.log(`Found ${usersWithZeroTokens} users with 0 tokens`);

      if (usersWithZeroTokens === 0) {
        console.log('No users with 0 tokens found. Nothing to update.');
        await client.query('COMMIT');
        return;
      }

      // Update users with 0 tokens to have 1 token
      const result = await client.query('UPDATE users SET tokens = 1 WHERE tokens = 0');
      console.log(`Updated ${result.rowCount} users to have 1 token`);

      // Show summary of token distribution
      const tokenDistribution = await client.query(`
        SELECT 
          tokens,
          COUNT(*) as user_count
        FROM users 
        GROUP BY tokens 
        ORDER BY tokens
      `);
      
      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      console.log('\n=== TOKEN UPDATE COMPLETED ===');
      console.log('Token distribution:');
      tokenDistribution.rows.forEach(row => {
        console.log(`  ${row.tokens} tokens: ${row.user_count} users`);
      });
      
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

giveUsersOneToken();