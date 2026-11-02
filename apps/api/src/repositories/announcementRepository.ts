// Announcement repository

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface AnnouncementRow {
  id: number;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  pinned: number;
  author_id: number;
  author_name?: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const announcementRepository = {
  async findById(id: number): Promise<AnnouncementRow | null> {
    const db = await getDb();
    const rows = await db.query<AnnouncementRow>(
      `SELECT a.*, u.full_name as author_name FROM announcements a
       LEFT JOIN users u ON u.id = a.author_id
       WHERE a.id = ? LIMIT 1`, [id]
    );
    return rows[0] ?? null;
  },

  async create(params: {
    title: string;
    content: string;
    status: 'draft' | 'published' | 'archived';
    pinned: boolean;
    authorId: number;
    expiresAt?: string | null;
  }): Promise<number> {
    const db = await getDb();
    const sql = `
      INSERT INTO announcements (title, content, status, pinned, author_id, published_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ${params.status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'}, ?)
    `;
    const values: QueryParams = [
      params.title, params.content, params.status,
      params.pinned ? 1 : 0, params.authorId, params.expiresAt ?? null,
    ];
    const result = await db.execute(sql, values);
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    title: string;
    content: string;
    status: 'draft' | 'published' | 'archived';
    pinned: boolean;
    expiresAt: string | null;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      title: params.title, content: params.content, status: params.status,
      expires_at: params.expiresAt,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (params.pinned !== undefined) {
      sets.push('pinned = ?');
      values.push(params.pinned ? 1 : 0);
    }
    if (params.status === 'published') {
      sets.push('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)');
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: 'draft' | 'published' | 'archived';
    onlyPublished?: boolean;
  }): Promise<{ rows: AnnouncementRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.onlyPublished) {
      where.push('a.status = ?');
      values.push('published');
    } else if (params.status) {
      where.push('a.status = ?');
      values.push(params.status);
    }
    if (params.search) {
      where.push('(a.title LIKE ? OR a.content LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM announcements a ${whereSql}`, values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<AnnouncementRow>(
      `SELECT a.*, u.full_name as author_name FROM announcements a
       LEFT JOIN users u ON u.id = a.author_id
       ${whereSql}
       ORDER BY a.pinned DESC, COALESCE(a.published_at, a.created_at) DESC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },
};
