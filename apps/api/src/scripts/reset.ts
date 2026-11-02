// Reset database - hapus semua data dan jalankan ulang migration + seed

import fs from 'fs';
import { getDb, closeDb } from '../db/connection';
import { config } from '../config/env';

async function reset(): Promise<void> {
  console.log('[reset] Memulai reset database...');
  const db = await getDb();
  console.log(`[reset] Client: ${db.client}`);

  if (db.client === 'sqlite') {
    // Untuk SQLite, hapus file database
    await closeDb();
    const storagePath = config.db.storage;
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
      console.log(`[reset] File ${storagePath} dihapus`);
    }
    // Hapus juga WAL/SHM
    for (const ext of ['-wal', '-shm', '-journal']) {
      if (fs.existsSync(storagePath + ext)) {
        fs.unlinkSync(storagePath + ext);
      }
    }
  } else {
    // MySQL: drop semua tabel
    console.log('[reset] Menonaktifkan foreign key checks...');
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = await db.query<{ TableName: string } | { name: string }>(`
      SELECT table_name ${db.client === 'mysql' ? 'as TableName' : 'as name'} FROM information_schema.tables
      WHERE table_schema = ?
    `, [config.db.name]).catch(async () => {
      // SQLite fallback
      return db.query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
    });
    for (const t of tables) {
      const name = (t as { TableName?: string; name?: string }).TableName ?? (t as { name: string }).name;
      if (!name || name === '_migrations') continue;
      console.log(`[reset] DROP TABLE ${name}`);
      await db.execute(`DROP TABLE IF EXISTS ${name}`);
    }
    await db.execute('DROP TABLE IF EXISTS _migrations');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('[reset] Database dibersihkan. Jalankan db:migrate dan db:seed.');
  await closeDb();
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[reset] ERROR:', err);
    process.exit(1);
  });
