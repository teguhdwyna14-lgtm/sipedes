// =====================================================
// Migration Runner
// Menjalankan file SQL di folder database/migrations
// Kompatibel MySQL & SQLite
// =====================================================

import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection';
import { config } from '../config/env';
import type { DbAdapter } from '../db/types';

// Cari folder database/migrations mulai dari cwd hingga root monorepo
function findMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'database/migrations'),
    path.resolve(process.cwd(), '..', 'database/migrations'),
    path.resolve(process.cwd(), '..', '..', 'database/migrations'),
    path.resolve(__dirname, '..', '..', '..', 'database/migrations'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

const MIGRATIONS_DIR = findMigrationsDir();

const SQLITE_SUBDIR = 'sqlite';
const MYSQL_SUBDIR = 'mysql';

function listMigrationFiles(): { version: string; file: string; fullPath: string }[] {
  const subdir = config.db.client === 'sqlite' ? SQLITE_SUBDIR : MYSQL_SUBDIR;
  const dir = path.join(MIGRATIONS_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      version: file.replace(/\.sql$/, ''),
      file,
      fullPath: path.join(dir, file),
    }));
}

async function ensureMigrationsTable(db: DbAdapter): Promise<void> {
  if (db.client === 'sqlite') {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
}

async function getAppliedVersions(db: DbAdapter): Promise<string[]> {
  const rows = await db.query<{ version: string }>('SELECT version FROM _migrations ORDER BY version');
  return rows.map((r) => r.version);
}

function splitSqlStatements(sql: string): string[] {
  // Pisahkan berdasarkan `;` sederhana; abaikan comment baris
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return cleaned
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function migrateUp(target?: string): Promise<void> {
  const db = await getDb();
  await ensureMigrationsTable(db);
  const applied = await getAppliedVersions(db);
  const files = listMigrationFiles();
  const pending = files.filter((f) => !applied.includes(f.version) && (!target || f.version <= target));

  if (pending.length === 0) {
    console.log('[migrate] Tidak ada migration yang perlu dijalankan.');
    return;
  }

  console.log(`[migrate] Client: ${db.client}`);
  console.log(`[migrate] Menjalankan ${pending.length} migration...`);

  for (const migration of pending) {
    const sql = fs.readFileSync(migration.fullPath, 'utf8');
    const statements = splitSqlStatements(sql);
    console.log(`[migrate] > ${migration.file} (${statements.length} statement)`);
    for (const stmt of statements) {
      try {
        await db.execute(stmt);
      } catch (err) {
        const msg = (err as Error).message;
        // Abaikan error "already exists" pada SQLite (idempotency)
        if (db.client === 'sqlite' && /already exists|duplicate column/i.test(msg)) {
          console.log(`  [skip] ${msg}`);
          continue;
        }
        throw err;
      }
    }
    await db.execute('INSERT INTO _migrations (version) VALUES (?)', [migration.version]);
    console.log(`  [ok] ${migration.version} applied`);
  }

  console.log('[migrate] Selesai.');
}

async function migrateDown(steps = 1): Promise<void> {
  const db = await getDb();
  await ensureMigrationsTable(db);
  const applied = await getAppliedVersions(db);
  const toRevert = applied.slice(-steps).reverse();
  if (toRevert.length === 0) {
    console.log('[migrate:down] Tidak ada migration untuk di-rollback.');
    return;
  }
  console.log(`[migrate:down] Rollback ${toRevert.length} migration (placeholder).`);
  console.log('[migrate:down] Catatan: rollback penuh belum diimplementasikan. Gunakan db:reset.');
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'up';
  try {
    if (command === 'up') {
      await migrateUp(process.argv[3]);
    } else if (command === 'down') {
      await migrateDown(parseInt(process.argv[3] ?? '1', 10));
    } else {
      console.error('Perintah tidak dikenal. Gunakan: up | down [steps]');
      process.exit(1);
    }
  } catch (err) {
    console.error('[migrate] ERROR:', err);
    process.exit(1);
  }
}

main();
