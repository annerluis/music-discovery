import { Pool } from 'pg';

const { SUPABASE_DB_URL } = process.env;
if (!SUPABASE_DB_URL) {
  throw new Error('SUPABASE_DB_URL is not set');
}

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                // sensible defaults for small plans
  idleTimeoutMillis: 30000
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

export default pool;