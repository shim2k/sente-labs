import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/connection';

async function removeScores() {
  const client = await pool().connect();
  
  try {
    console.log('Removing score_jsonb column from reviews table...');
    
    // Check if column exists before trying to drop it
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' AND column_name = 'score_jsonb'
    `);

    if (columnExists.rows.length > 0) {
      await client.query('ALTER TABLE reviews DROP COLUMN score_jsonb');
      console.log('score_jsonb column removed successfully');
    } else {
      console.log('score_jsonb column does not exist, skipping');
    }
  } catch (error) {
    console.error('Error removing score_jsonb column:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

removeScores();