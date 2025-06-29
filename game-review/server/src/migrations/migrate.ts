import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../db/connection';

async function runMigration() {
  try {
    const schemaSQL = readFileSync(join(__dirname, '../../src/db/schema.sql'), 'utf8');
    await pool().query(schemaSQL);
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();