import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function createDatabase() {
  // Connect to the default 'postgres' database first
  const defaultDbUrl = process.env.DATABASE_URL?.replace('/aoe4', '/postgres');
  
  console.log('Connecting to default postgres database...');
  
  const pool = new Pool({
    connectionString: defaultDbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if aoe4 database exists
    const result = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'aoe4'"
    );

    if (result.rows.length === 0) {
      console.log('Creating aoe4 database...');
      await pool.query('CREATE DATABASE aoe4');
      console.log('Database aoe4 created successfully!');
    } else {
      console.log('Database aoe4 already exists.');
    }
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDatabase();