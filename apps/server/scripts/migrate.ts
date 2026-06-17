import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pool from '../src/lib/db';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

async function runMigrations(): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('[migrate] No migration files found.');
    return;
  }

  console.log(`[migrate] Found ${files.length} migration(s).`);

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    process.stdout.write(`[migrate] Running ${file} ... `);
    // Each migration file runs in its own transaction so a failure leaves
    // the database in a consistent state.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('done');
    } catch (err) {
      await client.query('ROLLBACK');
      console.log('FAILED');
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[migrate] All migrations applied successfully.');
}

runMigrations()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrate] Migration error:', err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
