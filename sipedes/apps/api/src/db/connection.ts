// =====================================================
// Database Adapter
// Mendukung MySQL (production/Laragon) dan SQLite (testing lokal)
// =====================================================

import sqlite3 from 'sqlite3';
import { config } from '../config/env';
import type {
  QueryResult,
  DbAdapter,
  QueryParams,
} from './types';

let adapter: DbAdapter | null = null;

async function createMysqlAdapter(): Promise<DbAdapter> {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    charset: config.db.charset,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false,
    dateStrings: true,
  });

  return {
    client: 'mysql',
    async query<T = QueryResult>(sql: string, params: QueryParams = []): Promise<T[]> {
      const [rows] = await pool.query(sql, params as never);
      return rows as T[];
    },
    async execute<T = QueryResult>(sql: string, params: QueryParams = []): Promise<T> {
      const [result] = await pool.execute(sql, params as never);
      return result as T;
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

async function createSqliteAdapter(): Promise<DbAdapter> {
  const fs = await import('fs');
  const path = await import('path');
  const storageDir = path.dirname(path.resolve(config.db.storage));
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const db = new sqlite3.Database(config.db.storage);

  const asyncRun = (sql: string, params: unknown[]): Promise<QueryResult> =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (this: { lastID?: number; changes?: number }, err: Error | null) {
        if (err) return reject(err);
        resolve({
          insertId: this.lastID ?? 0,
          affectedRows: this.changes ?? 0,
        });
      });
    });

  const asyncAll = <T>(sql: string, params: unknown[]): Promise<T[]> =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

  return {
    client: 'sqlite',
    async query<T = QueryResult>(sql: string, params: QueryParams = []): Promise<T[]> {
      // PRAGMA & DDL tidak mengembalikan rows
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('PRAGMA') || trimmed.startsWith('CREATE') || trimmed.startsWith('DROP') ||
          trimmed.startsWith('ALTER') || trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') ||
          trimmed.startsWith('DELETE') || trimmed.startsWith('SET')) {
        await asyncRun(sql, params as unknown[]);
        return [];
      }
      return asyncAll<T>(sql, params as unknown[]);
    },
    async execute<T = QueryResult>(sql: string, params: QueryParams = []): Promise<T> {
      return asyncRun(sql, params as unknown[]) as Promise<T>;
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        db.close((err: Error | null) => (err ? reject(err) : resolve()));
      });
    },
  };
}

export async function getDb(): Promise<DbAdapter> {
  if (adapter) return adapter;
  if (config.db.client === 'sqlite') {
    adapter = await createSqliteAdapter();
    await adapter.execute('PRAGMA foreign_keys = ON');
    await adapter.execute('PRAGMA journal_mode = WAL');
  } else {
    adapter = await createMysqlAdapter();
  }
  return adapter;
}

export async function closeDb(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}

export function normalizeInsertId(result: unknown): number {
  const r = result as { insertId?: number; lastInsertRowid?: number };
  return r.insertId ?? 0;
}
