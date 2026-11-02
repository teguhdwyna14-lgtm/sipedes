// User repository - akses data users

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';
import type { User } from '@sipedes/shared';

export interface UserRow {
  id: number;
  email: string;
  nik: string | null;
  password_hash: string;
  password_changed_at: string | null;
  full_name: string;
  role: 'warga' | 'petugas' | 'admin';
  status: 'pending' | 'active' | 'rejected' | 'disabled';
  phone: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublicRow {
  id: number;
  email: string;
  nik: string | null;
  password_changed_at: string | null;
  full_name: string;
  role: 'warga' | 'petugas' | 'admin';
  status: 'pending' | 'active' | 'rejected' | 'disabled';
  phone: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

function toPublic(row: UserRow): UserPublicRow {
  // hapus password_hash
  const { password_hash: _ph, ...rest } = row;
  return rest;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const db = await getDb();
    const rows = await db.query<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
  },

  async findByNik(nik: string): Promise<UserRow | null> {
    const db = await getDb();
    const rows = await db.query<UserRow>('SELECT * FROM users WHERE nik = ? LIMIT 1', [nik]);
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<UserRow | null> {
    const db = await getDb();
    const rows = await db.query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async findPublicById(id: number): Promise<UserPublicRow | null> {
    const row = await this.findById(id);
    return row ? toPublic(row) : null;
  },

  async create(params: {
    email: string;
    nik?: string | null;
    passwordHash: string;
    fullName: string;
    role?: 'warga' | 'petugas' | 'admin';
    status?: 'pending' | 'active' | 'rejected' | 'disabled';
    phone?: string | null;
  }): Promise<number> {
    const db = await getDb();
    const sql = `
      INSERT INTO users (email, nik, password_hash, full_name, role, status, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values: QueryParams = [
      params.email,
      params.nik ?? null,
      params.passwordHash,
      params.fullName,
      params.role ?? 'warga',
      params.status ?? 'pending',
      params.phone ?? null,
    ];
    const result = await db.execute(sql, values);
    return normalizeInsertId(result);
  },

  async updateStatus(id: number, status: 'pending' | 'active' | 'rejected' | 'disabled'): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  },

  async updatePasswordHash(id: number, passwordHash: string, markChanged = true): Promise<void> {
    const db = await getDb();
    if (markChanged) {
      await db.execute(
        'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, id]
      );
    } else {
      await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    }
  },

  async updateNik(id: number, nik: string | null): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE users SET nik = ? WHERE id = ?', [nik, id]);
  },

  async updateProfile(id: number, params: { fullName?: string; phone?: string | null; avatarUrl?: string | null }): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    if (params.fullName !== undefined) {
      sets.push('full_name = ?');
      values.push(params.fullName);
    }
    if (params.phone !== undefined) {
      sets.push('phone = ?');
      values.push(params.phone);
    }
    if (params.avatarUrl !== undefined) {
      sets.push('avatar_url = ?');
      values.push(params.avatarUrl);
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async updateLastLogin(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  },

  async list(params: { page: number; limit: number; search?: string; role?: string; status?: string }): Promise<{ rows: UserPublicRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.search) {
      where.push('(full_name LIKE ? OR email LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    if (params.role) {
      where.push('role = ?');
      values.push(params.role);
    }
    if (params.status) {
      where.push('status = ?');
      values.push(params.status);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM users ${whereSql}`, values);
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<UserRow>(
      `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows: rows.map(toPublic), total };
  },

  async countByStatus(status: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE status = ?', [status]);
    return rows[0]?.count ?? 0;
  },

  async countByRole(role: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    return rows[0]?.count ?? 0;
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
  },
};

export function rowToUser(row: UserPublicRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Cek apakah user masih memakai password awal (belum pernah diganti) */
export function mustChangePassword(row: UserPublicRow): boolean {
  return row.password_changed_at === null;
}
