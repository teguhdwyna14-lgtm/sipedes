// News repository

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface NewsRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  author_id: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export const newsRepository = {
  async findById(id: number): Promise<NewsRow | null> {
    const db = await getDb();
    const rows = await db.query<NewsRow>(
      `SELECT n.*, u.full_name as author_name FROM news n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findBySlug(slug: string): Promise<NewsRow | null> {
    const db = await getDb();
    const rows = await db.query<NewsRow>(
      `SELECT n.*, u.full_name as author_name FROM news n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.slug = ? LIMIT 1`,
      [slug]
    );
    return rows[0] ?? null;
  },

  async create(params: {
    title: string;
    slug: string;
    excerpt?: string | null;
    content: string;
    category?: string | null;
    imageUrl?: string | null;
    status: 'draft' | 'published' | 'archived';
    authorId: number;
  }): Promise<number> {
    const db = await getDb();
    const sql = `
      INSERT INTO news (title, slug, excerpt, content, category, image_url, status, author_id, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${params.status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})
    `;
    const values: QueryParams = [
      params.title, params.slug, params.excerpt ?? null, params.content,
      params.category ?? null, params.imageUrl ?? null, params.status, params.authorId,
    ];
    const result = await db.execute(sql, values);
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    category: string | null;
    imageUrl: string | null;
    status: 'draft' | 'published' | 'archived';
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      title: params.title, slug: params.slug, excerpt: params.excerpt,
      content: params.content, category: params.category, image_url: params.imageUrl,
      status: params.status,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    // Jika status berubah ke published dan belum pernah dipublikasi
    if (params.status === 'published') {
      sets.push('published_at = COALESCE(published_at, CURRENT_TIMESTAMP)');
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE news SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM news WHERE id = ?', [id]);
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: 'draft' | 'published' | 'archived';
    onlyPublished?: boolean;
  }): Promise<{ rows: NewsRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.onlyPublished) {
      where.push('n.status = ?');
      values.push('published');
    } else if (params.status) {
      where.push('n.status = ?');
      values.push(params.status);
    }
    if (params.search) {
      where.push('(n.title LIKE ? OR n.content LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    if (params.category) {
      where.push('n.category = ?');
      values.push(params.category);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM news n ${whereSql}`, values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<NewsRow>(
      `SELECT n.*, u.full_name as author_name FROM news n
       LEFT JOIN users u ON u.id = n.author_id
       ${whereSql}
       ORDER BY ${params.onlyPublished ? 'COALESCE(n.published_at, n.created_at)' : 'n.created_at'} DESC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async listCategories(): Promise<string[]> {
    const db = await getDb();
    const rows = await db.query<{ category: string }>(
      "SELECT DISTINCT category FROM news WHERE category IS NOT NULL AND category != '' ORDER BY category"
    );
    return rows.map((r) => r.category);
  },
};
