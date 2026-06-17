"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const db_1 = __importDefault(require("../src/lib/db"));
const MIGRATIONS_DIR = (0, node_path_1.join)(__dirname, '..', 'migrations');
async function runMigrations() {
    const files = (0, node_fs_1.readdirSync)(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));
    if (files.length === 0) {
        console.log('[migrate] No migration files found.');
        return;
    }
    console.log(`[migrate] Found ${files.length} migration(s).`);
    for (const file of files) {
        const sql = (0, node_fs_1.readFileSync)((0, node_path_1.join)(MIGRATIONS_DIR, file), 'utf-8');
        process.stdout.write(`[migrate] Running ${file} ... `);
        // Each migration file runs in its own transaction so a failure leaves
        // the database in a consistent state.
        const client = await db_1.default.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log('done');
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.log('FAILED');
            throw err;
        }
        finally {
            client.release();
        }
    }
    console.log('[migrate] All migrations applied successfully.');
}
runMigrations()
    .then(async () => {
    await db_1.default.end();
    process.exit(0);
})
    .catch(async (err) => {
    console.error('[migrate] Migration error:', err);
    await db_1.default.end().catch(() => undefined);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map