import { Pool, type QueryResult, type QueryResultRow } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL is not set');
  process.exit(1);
}

/**
 * Single shared connection pool for the entire process.
 * SSL is enabled automatically for non-local (e.g. Supabase) connections.
 */
const isLocal =
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

// A pool-level error means an idle client errored out (e.g. connection
// dropped). This is unrecoverable at the pool level — log and exit so the
// process manager can restart cleanly.
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
  process.exit(1);
});

/**
 * Run a parameterized query against the pool.
 * Always use the `params` array for user input — never string interpolation.
 */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export default pool;
