import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/connection';

async function addAOE4WorldColumns() {
  const client = await pool().connect();
  
  try {
    console.log('Adding AOE4World columns to identities table...');
    
    // Check if columns already exist
    const columnsExist = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'identities' 
      AND column_name IN ('aoe4world_profile_id', 'aoe4world_username')
    `);

    if (columnsExist.rows.length === 0) {
      await client.query(`
        ALTER TABLE identities 
        ADD COLUMN aoe4world_profile_id TEXT,
        ADD COLUMN aoe4world_username TEXT
      `);
      console.log('AOE4World columns added successfully');
    } else {
      console.log('AOE4World columns already exist, skipping');
    }
  } catch (error) {
    console.error('Error adding AOE4World columns:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

addAOE4WorldColumns();