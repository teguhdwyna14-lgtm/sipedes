// Complaint repository

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface ComplaintRow {
  id: number;
  tracking_code: string;
  user_id: number;
  user_full_name?: string;
  title: string;
  description: string;
  category: string | null;
  status: 'baru' | 'diterima' | 'diproses' | 'selesai' | 'ditutup';
  is_anonymous: number;
  created_at: string;
  updated_at: string;
}

export interface ComplaintUpdateRow {
  id: number;
  complaint_id: number;
  status: ComplaintRow['status'];
  note: string | null;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
}

export const complaintRepository = {
  async findById(id: number): Promise<ComplaintRow | null> {
    const db = await getDb();
    const rows = await db.query<ComplaintRow>(
      `SELECT c.*, u.full_name as user_full_name FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ? LIMIT 1`, [id]
    );
    return rows[0] ?? null;
  },

  async findByTrackingCode(code: string): Promise<ComplaintRow | null> {
    const db = await getDb();
    const rows = await db.query<ComplaintRow>(
      `SELECT c.*, u.full_name as user_full_name FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id WHERE c.tracking_code = ? LIMIT 1`, [code]
    );
    return rows[0] ?? null;
  },

  async create(params: {
    trackingCode: string;
    userId: number;
    title: string;
    description: string;
    category?: string | null;
    isAnonymous: boolean;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO complaints (tracking_code, user_id, title, description, category, status, is_anonymous)
       VALUES (?, ?, ?, ?, ?, 'baru', ?)`,
      [params.trackingCode, params.userId, params.title, params.description, params.category ?? null, params.isAnonymous ? 1 : 0]
    );
    return normalizeInsertId(result);
  },

  async addUpdate(params: {
    complaintId: number;
    status: ComplaintRow['status'];
    note?: string | null;
    createdById: number;
  }): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT INTO complaint_updates (complaint_id, status, note, created_by_id) VALUES (?, ?, ?, ?)`,
      [params.complaintId, params.status, params.note ?? null, params.createdById]
    );
    await db.execute('UPDATE complaints SET status = ? WHERE id = ?', [params.status, params.complaintId]);
  },

  async listUpdates(complaintId: number): Promise<ComplaintUpdateRow[]> {
    const db = await getDb();
    return db.query<ComplaintUpdateRow>(
      `SELECT cu.*, u.full_name as created_by_name FROM complaint_updates cu
       LEFT JOIN users u ON u.id = cu.created_by_id
       WHERE cu.complaint_id = ? ORDER BY cu.created_at ASC`, [complaintId]
    );
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    category?: string;
    userId?: number;
  }): Promise<{ rows: ComplaintRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.userId) {
      where.push('c.user_id = ?');
      values.push(params.userId);
    }
    if (params.status) {
      where.push('c.status = ?');
      values.push(params.status);
    }
    if (params.category) {
      where.push('c.category = ?');
      values.push(params.category);
    }
    if (params.search) {
      where.push('(c.title LIKE ? OR c.description LIKE ? OR c.tracking_code LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM complaints c ${whereSql}`, values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<ComplaintRow>(
      `SELECT c.*, u.full_name as user_full_name FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id
       ${whereSql}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async countByStatus(status: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM complaints WHERE status = ?', [status]);
    return rows[0]?.count ?? 0;
  },

  async countOpen(): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM complaints WHERE status IN ('baru','diterima','diproses')"
    );
    return rows[0]?.count ?? 0;
  },

  async countByUser(userId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM complaints WHERE user_id = ?', [userId]);
    return rows[0]?.count ?? 0;
  },
};
