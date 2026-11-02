// Resident profile repository

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface ResidentRow {
  id: number;
  user_id: number;
  nik: string | null;
  kk_number: string | null;
  full_name: string;
  birth_date: string | null;
  gender: 'L' | 'P' | null;
  address: string | null;
  rt: string | null;
  rw: string | null;
  phone: string | null;
  occupation: string | null;
  status: 'pending' | 'active' | 'rejected' | 'disabled';
  verified_by_id: number | null;
  verified_at: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
}

export const residentRepository = {
  async findByUserId(userId: number): Promise<ResidentRow | null> {
    const db = await getDb();
    const rows = await db.query<ResidentRow>('SELECT * FROM resident_profiles WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<ResidentRow | null> {
    const db = await getDb();
    const rows = await db.query<ResidentRow>('SELECT * FROM resident_profiles WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async create(params: {
    userId: number;
    fullName: string;
    nik?: string | null;
    kkNumber?: string | null;
    birthDate?: string | null;
    gender?: 'L' | 'P' | null;
    address?: string | null;
    rt?: string | null;
    rw?: string | null;
    phone?: string | null;
    occupation?: string | null;
    status?: 'pending' | 'active' | 'rejected' | 'disabled';
  }): Promise<number> {
    const db = await getDb();
    const sql = `
      INSERT INTO resident_profiles
        (user_id, full_name, nik, kk_number, birth_date, gender, address, rt, rw, phone, occupation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values: QueryParams = [
      params.userId,
      params.fullName,
      params.nik ?? null,
      params.kkNumber ?? null,
      params.birthDate ?? null,
      params.gender ?? null,
      params.address ?? null,
      params.rt ?? null,
      params.rw ?? null,
      params.phone ?? null,
      params.occupation ?? null,
      params.status ?? 'pending',
    ];
    const result = await db.execute(sql, values);
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    fullName: string;
    nik: string | null;
    kkNumber: string | null;
    birthDate: string | null;
    gender: 'L' | 'P' | null;
    address: string | null;
    rt: string | null;
    rw: string | null;
    phone: string | null;
    occupation: string | null;
    status: 'pending' | 'active' | 'rejected' | 'disabled';
    verifiedById: number | null;
    rejectionNote: string | null;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      full_name: params.fullName,
      nik: params.nik,
      kk_number: params.kkNumber,
      birth_date: params.birthDate,
      gender: params.gender,
      address: params.address,
      rt: params.rt,
      rw: params.rw,
      phone: params.phone,
      occupation: params.occupation,
      status: params.status,
      verified_by_id: params.verifiedById,
      rejection_note: params.rejectionNote,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE resident_profiles SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async verify(id: number, verifiedById: number, status: 'active' | 'rejected', rejectionNote?: string): Promise<void> {
    const db = await getDb();
    if (status === 'active') {
      await db.execute(
        `UPDATE resident_profiles SET status = 'active', verified_by_id = ?, verified_at = CURRENT_TIMESTAMP, rejection_note = NULL WHERE id = ?`,
        [verifiedById, id]
      );
    } else {
      await db.execute(
        `UPDATE resident_profiles SET status = 'rejected', verified_by_id = ?, verified_at = CURRENT_TIMESTAMP, rejection_note = ? WHERE id = ?`,
        [verifiedById, rejectionNote ?? null, id]
      );
    }
  },

  async list(params: { page: number; limit: number; search?: string; status?: string; rt?: string; rw?: string }): Promise<{ rows: ResidentRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.search) {
      where.push('(full_name LIKE ? OR nik LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    if (params.status) {
      where.push('status = ?');
      values.push(params.status);
    }
    if (params.rt) {
      where.push('rt = ?');
      values.push(params.rt);
    }
    if (params.rw) {
      where.push('rw = ?');
      values.push(params.rw);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM resident_profiles ${whereSql}`, values);
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<ResidentRow>(
      `SELECT * FROM resident_profiles ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async countByStatus(status: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM resident_profiles WHERE status = ?', [status]);
    return rows[0]?.count ?? 0;
  },
};
