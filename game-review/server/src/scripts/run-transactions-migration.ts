import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runTransactionsMigration() {
  const client = await pool().connect();
  
  try {
    console.log('Running transactions table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/migration_add_transactions_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Transactions table migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool().end();
  }
}

runTransactionsMigration();