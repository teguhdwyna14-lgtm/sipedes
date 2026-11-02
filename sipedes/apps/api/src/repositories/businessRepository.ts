// Resident business repository
// CRUD untuk jasa & usaha warga (resident_businesses)

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface BusinessRow {
  id: number;
  owner_id: number;
  owner_name?: string;
  owner_user_id?: number | null;
  category_id: number;
  category_name?: string;
  name: string;
  description: string | null;
  whatsapp: string | null;
  whatsapp_published: number;
  address: string | null;
  rt: string | null;
  rw: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  rejection_note: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Field select umum yang dipakai oleh query ber-JOIN
const BUSINESS_SELECT_FIELDS = `
  rb.id, rb.owner_id, rb.category_id, rb.name, rb.description,
  rb.whatsapp, rb.whatsapp_published, rb.address, rb.rt, rb.rw,
  rb.photo_url, rb.latitude, rb.longitude, rb.status,
  rb.rejection_note, rb.approved_by_id, rb.approved_at,
  rb.created_at, rb.updated_at,
  rp.full_name AS owner_name,
  rp.user_id AS owner_user_id,
  bc.name AS category_name
`;

export const businessRepository = {
  async findById(id: number): Promise<BusinessRow | null> {
    const db = await getDb();
    const rows = await db.query<BusinessRow>(
      `SELECT ${BUSINESS_SELECT_FIELDS}
       FROM resident_businesses rb
       LEFT JOIN resident_profiles rp ON rp.id = rb.owner_id
       LEFT JOIN business_categories bc ON bc.id = rb.category_id
       WHERE rb.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: number;
    status?: string;
    ownerId?: number;
    onlyApproved?: boolean;
  }): Promise<{ rows: BusinessRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.onlyApproved) {
      where.push('rb.status = ?');
      values.push('approved');
    } else if (params.status) {
      where.push('rb.status = ?');
      values.push(params.status);
    }
    if (params.categoryId) {
      where.push('rb.category_id = ?');
      values.push(params.categoryId);
    }
    if (params.ownerId) {
      where.push('rb.owner_id = ?');
      values.push(params.ownerId);
    }
    if (params.search) {
      where.push('(rb.name LIKE ? OR rb.description LIKE ? OR rb.address LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM resident_businesses rb ${whereSql}`,
      values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<BusinessRow>(
      `SELECT ${BUSINESS_SELECT_FIELDS}
       FROM resident_businesses rb
       LEFT JOIN resident_profiles rp ON rp.id = rb.owner_id
       LEFT JOIN business_categories bc ON bc.id = rb.category_id
       ${whereSql}
       ORDER BY ${params.onlyApproved ? 'rb.created_at DESC' : 'rb.created_at DESC'}
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async create(params: {
    ownerId: number;
    categoryId: number;
    name: string;
    description?: string | null;
    whatsapp?: string | null;
    whatsappPublished?: boolean;
    address?: string | null;
    rt?: string | null;
    rw?: string | null;
    photoUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status?: 'pending' | 'approved' | 'rejected' | 'disabled';
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO resident_businesses
        (owner_id, category_id, name, description, whatsapp, whatsapp_published,
         address, rt, rw, photo_url, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.ownerId,
        params.categoryId,
        params.name,
        params.description ?? null,
        params.whatsapp ?? null,
        params.whatsappPublished === false ? 0 : 1,
        params.address ?? null,
        params.rt ?? null,
        params.rw ?? null,
        params.photoUrl ?? null,
        params.latitude ?? null,
        params.longitude ?? null,
        params.status ?? 'pending',
      ]
    );
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    categoryId: number;
    name: string;
    description: string | null;
    whatsapp: string | null;
    whatsappPublished: boolean;
    address: string | null;
    rt: string | null;
    rw: string | null;
    photoUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      category_id: params.categoryId,
      name: params.name,
      description: params.description,
      whatsapp: params.whatsapp,
      address: params.address,
      rt: params.rt,
      rw: params.rw,
      photo_url: params.photoUrl,
      latitude: params.latitude,
      longitude: params.longitude,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (params.whatsappPublished !== undefined) {
      sets.push('whatsapp_published = ?');
      values.push(params.whatsappPublished ? 1 : 0);
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE resident_businesses SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async updateStatus(
    id: number,
    status: 'pending' | 'approved' | 'rejected' | 'disabled',
    approvedById: number | null,
    rejectionNote?: string | null
  ): Promise<void> {
    const db = await getDb();
    if (status === 'approved') {
      await db.execute(
        `UPDATE resident_businesses
         SET status = ?, approved_by_id = ?, approved_at = CURRENT_TIMESTAMP, rejection_note = NULL
         WHERE id = ?`,
        [status, approvedById, id]
      );
    } else {
      await db.execute(
        `UPDATE resident_businesses
         SET status = ?, rejection_note = ?
         WHERE id = ?`,
        [status, rejectionNote ?? null, id]
      );
    }
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM resident_businesses WHERE id = ?', [id]);
  },

  async countByStatus(status: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM resident_businesses WHERE status = ?',
      [status]
    );
    return rows[0]?.count ?? 0;
  },

  async countByCategory(categoryId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM resident_businesses WHERE category_id = ?',
      [categoryId]
    );
    return rows[0]?.count ?? 0;
  },

  async countByOwner(ownerId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM resident_businesses WHERE owner_id = ?',
      [ownerId]
    );
    return rows[0]?.count ?? 0;
  },
};
