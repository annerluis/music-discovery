import Dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';

Dotenv.config({ path: path.join(import.meta.dirname,'../.env')});

const pool = new Pool({
  connectionString: process.env.DB_URL,           
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_MS || 30000),
  connectionTimeoutMillis: Number(process.env.PG_CONN_MS || 10000),
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// For pgvector: pass as $2::vector in SQL
export function toPgVector(arr) {
  if (!Array.isArray(arr)) throw new Error('toPgVector expects an array');
  return `[${arr.join(',')}]`;
}

// graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
