// Business category repository
// CRUD untuk kategori jasa & usaha warga

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface BusinessCategoryRow {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const businessCategoryRepository = {
  async findById(id: number): Promise<BusinessCategoryRow | null> {
    const db = await getDb();
    const rows = await db.query<BusinessCategoryRow>(
      'SELECT * FROM business_categories WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async findBySlug(slug: string): Promise<BusinessCategoryRow | null> {
    const db = await getDb();
    const rows = await db.query<BusinessCategoryRow>(
      'SELECT * FROM business_categories WHERE slug = ? LIMIT 1',
      [slug]
    );
    return rows[0] ?? null;
  },

  async findAllActive(): Promise<BusinessCategoryRow[]> {
    const db = await getDb();
    return db.query<BusinessCategoryRow>(
      `SELECT * FROM business_categories
       WHERE active = 1
       ORDER BY sort_order ASC, name ASC`
    );
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<{ rows: BusinessCategoryRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.activeOnly) {
      where.push('active = 1');
    }
    if (params.search) {
      where.push('(name LIKE ? OR slug LIKE ? OR description LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM business_categories ${whereSql}`,
      values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<BusinessCategoryRow>(
      `SELECT * FROM business_categories ${whereSql}
       ORDER BY sort_order ASC, name ASC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async create(params: {
    name: string;
    slug: string;
    icon?: string | null;
    description?: string | null;
    sortOrder?: number;
    active?: boolean;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO business_categories (name, slug, icon, description, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.name,
        params.slug,
        params.icon ?? null,
        params.description ?? null,
        params.active === false ? 0 : 1,
        params.sortOrder ?? 0,
      ]
    );
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    sortOrder: number;
    active: boolean;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      name: params.name,
      slug: params.slug,
      icon: params.icon,
      description: params.description,
      sort_order: params.sortOrder,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (params.active !== undefined) {
      sets.push('active = ?');
      values.push(params.active ? 1 : 0);
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE business_categories SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM business_categories WHERE id = ?', [id]);
  },

  async countBusinesses(categoryId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM resident_businesses WHERE category_id = ?',
      [categoryId]
    );
    return rows[0]?.count ?? 0;
  },
};
