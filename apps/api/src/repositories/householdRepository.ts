// Household (Kartu Keluarga) repository
// Mengelola tabel households dan household_members

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface HouseholdRow {
  id: number;
  kk_number: string | null;
  address: string;
  rt: string | null;
  rw: string | null;
  dusun: string | null;
  head_resident_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Row list dengan member_count subquery
export interface HouseholdListRow extends HouseholdRow {
  member_count: number;
  head_name?: string | null;
}

export interface HouseholdMemberRow {
  id: number;
  household_id: number;
  resident_id: number;
  role: string;
  is_head: number;
  full_name: string;
  gender: 'L' | 'P' | null;
  birth_date: string | null;
  phone: string | null;
  phone_published: number;
  status: string;
  nik: string | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export const householdRepository = {
  async findById(id: number): Promise<HouseholdRow | null> {
    const db = await getDb();
    const rows = await db.query<HouseholdRow>('SELECT * FROM households WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async findByIdWithDetails(id: number): Promise<HouseholdListRow | null> {
    const db = await getDb();
    const rows = await db.query<HouseholdListRow>(
      `SELECT h.*,
        (SELECT COUNT(*) FROM household_members hm WHERE hm.household_id = h.id) AS member_count,
        (SELECT rp.full_name FROM resident_profiles rp WHERE rp.id = h.head_resident_id) AS head_name
       FROM households h
       WHERE h.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    rt?: string;
    rw?: string;
    dusun?: string;
  }): Promise<{ rows: HouseholdListRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.search) {
      where.push('(h.address LIKE ? OR h.kk_number LIKE ? OR h.dusun LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    if (params.rt) {
      where.push('h.rt = ?');
      values.push(params.rt);
    }
    if (params.rw) {
      where.push('h.rw = ?');
      values.push(params.rw);
    }
    if (params.dusun) {
      where.push('h.dusun LIKE ?');
      values.push(`%${params.dusun}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM households h ${whereSql}`,
      values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<HouseholdListRow>(
      `SELECT h.*,
        (SELECT COUNT(*) FROM household_members hm WHERE hm.household_id = h.id) AS member_count,
        (SELECT rp.full_name FROM resident_profiles rp WHERE rp.id = h.head_resident_id) AS head_name
       FROM households h
       ${whereSql}
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async create(params: {
    kkNumber?: string | null;
    address: string;
    rt?: string | null;
    rw?: string | null;
    dusun?: string | null;
    notes?: string | null;
    headResidentId?: number | null;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO households (kk_number, address, rt, rw, dusun, notes, head_resident_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.kkNumber ?? null,
        params.address,
        params.rt ?? null,
        params.rw ?? null,
        params.dusun ?? null,
        params.notes ?? null,
        params.headResidentId ?? null,
      ]
    );
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    kkNumber: string | null;
    address: string;
    rt: string | null;
    rw: string | null;
    dusun: string | null;
    notes: string | null;
    headResidentId: number | null;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      kk_number: params.kkNumber,
      address: params.address,
      rt: params.rt,
      rw: params.rw,
      dusun: params.dusun,
      notes: params.notes,
      head_resident_id: params.headResidentId,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE households SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    // Cascade akan menghapus anggota; namun kita juga harus clear household_id di resident_profiles
    await db.execute('UPDATE resident_profiles SET household_id = NULL, household_role = NULL WHERE household_id = ?', [id]);
    await db.execute('DELETE FROM households WHERE id = ?', [id]);
  },

  async listMembers(householdId: number): Promise<HouseholdMemberRow[]> {
    const db = await getDb();
    return db.query<HouseholdMemberRow>(
      `SELECT hm.id, hm.household_id, hm.resident_id, hm.role, hm.is_head,
              hm.created_at, hm.updated_at,
              rp.full_name, rp.gender, rp.birth_date, rp.phone, rp.phone_published,
              rp.status, rp.nik, rp.user_id
       FROM household_members hm
       INNER JOIN resident_profiles rp ON rp.id = hm.resident_id
       WHERE hm.household_id = ?
       ORDER BY hm.is_head DESC, rp.birth_date ASC`,
      [householdId]
    );
  },

  async findMemberById(memberId: number): Promise<HouseholdMemberRow | null> {
    const db = await getDb();
    const rows = await db.query<HouseholdMemberRow>(
      `SELECT hm.id, hm.household_id, hm.resident_id, hm.role, hm.is_head,
              hm.created_at, hm.updated_at,
              rp.full_name, rp.gender, rp.birth_date, rp.phone, rp.phone_published,
              rp.status, rp.nik, rp.user_id
       FROM household_members hm
       INNER JOIN resident_profiles rp ON rp.id = hm.resident_id
       WHERE hm.id = ?
       LIMIT 1`,
      [memberId]
    );
    return rows[0] ?? null;
  },

  async addMember(params: {
    householdId: number;
    residentId: number;
    role: string;
    isHead?: boolean;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO household_members (household_id, resident_id, role, is_head)
       VALUES (?, ?, ?, ?)`,
      [params.householdId, params.residentId, params.role, params.isHead ? 1 : 0]
    );
    const memberId = normalizeInsertId(result);
    // Sinkronkan kolom household_id & household_role di resident_profiles
    await db.execute(
      'UPDATE resident_profiles SET household_id = ?, household_role = ? WHERE id = ?',
      [params.householdId, params.role, params.residentId]
    );
    return memberId;
  },

  async updateMember(id: number, params: { role?: string; isHead?: boolean }): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    if (params.role !== undefined) {
      sets.push('role = ?');
      values.push(params.role);
    }
    if (params.isHead !== undefined) {
      sets.push('is_head = ?');
      values.push(params.isHead ? 1 : 0);
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE household_members SET ${sets.join(', ')} WHERE id = ?`, values);

    // Sinkronkan household_role di resident_profiles jika role diperbarui
    if (params.role !== undefined) {
      const member = await this.findMemberById(id);
      if (member) {
        await db.execute(
          'UPDATE resident_profiles SET household_role = ? WHERE id = ?',
          [params.role, member.resident_id]
        );
      }
    }
  },

  async removeMember(id: number): Promise<void> {
    const db = await getDb();
    const member = await this.findMemberById(id);
    if (!member) return;
    await db.execute('DELETE FROM household_members WHERE id = ?', [id]);
    // Bersihkan household_id & household_role di resident_profiles
    await db.execute(
      'UPDATE resident_profiles SET household_id = NULL, household_role = NULL WHERE id = ?',
      [member.resident_id]
    );
    // Jika yang dihapus adalah kepala keluarga, reset head_resident_id
    if (member.is_head === 1) {
      await db.execute(
        'UPDATE households SET head_resident_id = NULL WHERE id = ?',
        [member.household_id]
      );
    }
  },

  async findByResidentId(residentId: number): Promise<HouseholdRow | null> {
    const db = await getDb();
    const rows = await db.query<HouseholdRow>(
      `SELECT h.* FROM households h
       INNER JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.resident_id = ?
       LIMIT 1`,
      [residentId]
    );
    return rows[0] ?? null;
  },

  async setHead(householdId: number, residentId: number): Promise<void> {
    const db = await getDb();
    // Reset semua is_head anggota KK ini menjadi 0
    await db.execute(
      'UPDATE household_members SET is_head = 0 WHERE household_id = ?',
      [householdId]
    );
    // Tandai anggota terpilih sebagai kepala
    await db.execute(
      'UPDATE household_members SET is_head = 1 WHERE household_id = ? AND resident_id = ?',
      [householdId, residentId]
    );
    // Update head_resident_id di tabel households
    await db.execute(
      'UPDATE households SET head_resident_id = ? WHERE id = ?',
      [residentId, householdId]
    );
    // Opsional: update role anggota menjadi 'kepala'
    await db.execute(
      `UPDATE household_members SET role = 'kepala' WHERE household_id = ? AND resident_id = ?`,
      [householdId, residentId]
    );
    await db.execute(
      'UPDATE resident_profiles SET household_role = ? WHERE id = ?',
      ['kepala', residentId]
    );
  },

  async countMembers(householdId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM household_members WHERE household_id = ?',
      [householdId]
    );
    return rows[0]?.count ?? 0;
  },

  async countByRtRw(rt: string, rw: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM households WHERE rt = ? AND rw = ?',
      [rt, rw]
    );
    return rows[0]?.count ?? 0;
  },
};
