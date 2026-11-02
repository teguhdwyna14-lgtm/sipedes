// Document (Arsip) repository

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface DocumentRow {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  owner_id: number | null;
  request_id: number | null;
  is_public: number;
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
}

export const documentRepository = {
  async findById(id: number): Promise<DocumentRow | null> {
    const db = await getDb();
    const rows = await db.query<DocumentRow>('SELECT * FROM documents WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async create(params: {
    title: string;
    description?: string | null;
    category?: string | null;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
    ownerId?: number | null;
    requestId?: number | null;
    isPublic?: boolean;
    uploadedById: number;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO documents (title, description, category, file_name, file_path, mime_type, file_size, owner_id, request_id, is_public, uploaded_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [params.title, params.description ?? null, params.category ?? null, params.fileName, params.filePath,
       params.mimeType, params.fileSize, params.ownerId ?? null, params.requestId ?? null,
       params.isPublic ? 1 : 0, params.uploadedById]
    );
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    title: string;
    description: string | null;
    category: string | null;
    isPublic: boolean;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      title: params.title, description: params.description, category: params.category,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (params.isPublic !== undefined) {
      sets.push('is_public = ?');
      values.push(params.isPublic ? 1 : 0);
    }
    if (sets.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE documents SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM documents WHERE id = ?', [id]);
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    ownerId?: number;
    onlyPublic?: boolean;
  }): Promise<{ rows: DocumentRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.onlyPublic) {
      where.push('is_public = 1');
    }
    if (params.ownerId) {
      where.push('owner_id = ?');
      values.push(params.ownerId);
    }
    if (params.category) {
      where.push('category = ?');
      values.push(params.category);
    }
    if (params.search) {
      where.push('(title LIKE ? OR description LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM documents ${whereSql}`, values);
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<DocumentRow>(
      `SELECT * FROM documents ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },
};
