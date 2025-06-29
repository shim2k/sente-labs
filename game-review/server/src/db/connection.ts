import { Pool } from 'pg';

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    console.log('Creating database connection pool:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // AWS RDS requires SSL
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export { getPool as pool };