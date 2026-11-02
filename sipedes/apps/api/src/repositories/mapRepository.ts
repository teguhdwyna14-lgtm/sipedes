// Map repository
// Mengelola map_locations (penanda peta) dan map_files (berkas peta untuk diunduh)

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface MapLocationRow {
  id: number;
  name: string;
  type: 'kanton_desa' | 'fasilitas_umum' | 'usaha_warga' | 'batas_desa' | 'lainnya';
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  icon: string | null;
  linked_business_id: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface MapFileRow {
  id: number;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  attribution: string | null;
  uploaded_by_id: number;
  created_at: string;
}

export const mapRepository = {
  // ---------------------------------------------------
  // map_locations
  // ---------------------------------------------------

  async findLocationById(id: number): Promise<MapLocationRow | null> {
    const db = await getDb();
    const rows = await db.query<MapLocationRow>(
      'SELECT * FROM map_locations WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async listLocations(params: {
    page: number;
    limit: number;
    type?: string;
    activeOnly?: boolean;
  }): Promise<{ rows: MapLocationRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.activeOnly) {
      where.push('active = 1');
    }
    if (params.type) {
      where.push('type = ?');
      values.push(params.type);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM map_locations ${whereSql}`,
      values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<MapLocationRow>(
      `SELECT * FROM map_locations ${whereSql}
       ORDER BY
         CASE type
           WHEN 'kanton_desa' THEN 0
           WHEN 'fasilitas_umum' THEN 1
           WHEN 'usaha_warga' THEN 2
           WHEN 'batas_desa' THEN 3
           ELSE 4
         END ASC,
         name ASC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async listActiveLocations(type?: string): Promise<MapLocationRow[]> {
    const db = await getDb();
    if (type) {
      return db.query<MapLocationRow>(
        `SELECT * FROM map_locations
         WHERE active = 1 AND type = ?
         ORDER BY name ASC`,
        [type]
      );
    }
    return db.query<MapLocationRow>(
      `SELECT * FROM map_locations
       WHERE active = 1
       ORDER BY name ASC`
    );
  },

  async createLocation(params: {
    name: string;
    type: string;
    description?: string | null;
    latitude: number;
    longitude: number;
    address?: string | null;
    icon?: string | null;
    linkedBusinessId?: number | null;
    active?: boolean;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO map_locations
        (name, type, description, latitude, longitude, address, icon, linked_business_id, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.name,
        params.type,
        params.description ?? null,
        params.latitude,
        params.longitude,
        params.address ?? null,
        params.icon ?? null,
        params.linkedBusinessId ?? null,
        params.active === false ? 0 : 1,
      ]
    );
    return normalizeInsertId(result);
  },

  async updateLocation(id: number, params: Partial<{
    name: string;
    type: string;
    description: string | null;
    latitude: number;
    longitude: number;
    address: string | null;
    icon: string | null;
    linkedBusinessId: number | null;
    active: boolean;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      description: params.description,
      latitude: params.latitude,
      longitude: params.longitude,
      address: params.address,
      icon: params.icon,
      linked_business_id: params.linkedBusinessId,
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
    await db.execute(`UPDATE map_locations SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async deleteLocation(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM map_locations WHERE id = ?', [id]);
  },

  // ---------------------------------------------------
  // map_files
  // ---------------------------------------------------

  async findFileById(id: number): Promise<MapFileRow | null> {
    const db = await getDb();
    const rows = await db.query<MapFileRow>(
      'SELECT * FROM map_files WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async listFiles(params: { page: number; limit: number }): Promise<{ rows: MapFileRow[]; total: number }> {
    const db = await getDb();
    const totalRows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM map_files');
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<MapFileRow>(
      `SELECT * FROM map_files ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [params.limit, offset]
    );
    return { rows, total };
  },

  async createFile(params: {
    title: string;
    description?: string | null;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
    attribution?: string | null;
    uploadedById: number;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO map_files
        (title, description, file_name, file_path, mime_type, file_size, attribution, uploaded_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.title,
        params.description ?? null,
        params.fileName,
        params.filePath,
        params.mimeType,
        params.fileSize,
        params.attribution ?? null,
        params.uploadedById,
      ]
    );
    return normalizeInsertId(result);
  },

  async deleteFile(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM map_files WHERE id = ?', [id]);
  },
};
