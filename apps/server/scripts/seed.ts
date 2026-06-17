import 'dotenv/config';
import pool, { query } from '../src/lib/db';
import { hashPassword } from '../src/utils/hash';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

const users: SeedUser[] = [
  {
    name: 'Demo User',
    email: 'demo@test.com',
    password: 'Demo@12345',
    role: 'user',
  },
  {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin@12345',
    role: 'admin',
  },
];

async function seed(): Promise<void> {
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    // Upsert by unique email so re-running the seed is idempotent.
    await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             updated_at = NOW()`,
      [u.name, u.email, passwordHash, u.role],
    );
    console.log(`[seed] upserted ${u.role}: ${u.email}`);
  }
  console.log('[seed] Done.');
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seed] Error:', err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
