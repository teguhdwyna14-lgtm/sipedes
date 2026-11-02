// Service type & request repositories

import { getDb, normalizeInsertId } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface ServiceTypeRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requirements: string;
  processing_days: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export const serviceTypeRepository = {
  async findById(id: number): Promise<ServiceTypeRow | null> {
    const db = await getDb();
    const rows = await db.query<ServiceTypeRow>('SELECT * FROM service_types WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async findByCode(code: string): Promise<ServiceTypeRow | null> {
    const db = await getDb();
    const rows = await db.query<ServiceTypeRow>('SELECT * FROM service_types WHERE code = ? LIMIT 1', [code]);
    return rows[0] ?? null;
  },

  async create(params: {
    code: string;
    name: string;
    description?: string | null;
    requirements: string;
    processingDays?: number | null;
    active?: boolean;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO service_types (code, name, description, requirements, processing_days, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [params.code, params.name, params.description ?? null, params.requirements,
       params.processingDays ?? null, params.active === false ? 0 : 1]
    );
    return normalizeInsertId(result);
  },

  async update(id: number, params: Partial<{
    code: string;
    name: string;
    description: string | null;
    requirements: string;
    processingDays: number | null;
    active: boolean;
  }>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: QueryParams = [];
    const map: Record<string, unknown> = {
      code: params.code, name: params.name, description: params.description,
      requirements: params.requirements, processing_days: params.processingDays,
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
    await db.execute(`UPDATE service_types SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM service_types WHERE id = ?', [id]);
  },

  async list(params: { page: number; limit: number; search?: string; activeOnly?: boolean }): Promise<{ rows: ServiceTypeRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.activeOnly) {
      where.push('active = 1');
    }
    if (params.search) {
      where.push('(name LIKE ? OR code LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(`SELECT COUNT(*) as count FROM service_types ${whereSql}`, values);
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<ServiceTypeRow>(
      `SELECT * FROM service_types ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },
};

// ----- Service Request -----

export interface ServiceRequestRow {
  id: number;
  request_number: string;
  service_type_id: number;
  service_name?: string;
  user_id: number;
  user_full_name?: string;
  purpose: string;
  notes: string | null;
  status: 'diajukan' | 'dalam_pemeriksaan' | 'perlu_perbaikan' | 'disetujui' | 'ditolak' | 'selesai';
  rejection_reason: string | null;
  processed_by_id: number | null;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestAttachmentRow {
  id: number;
  request_id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface ServiceRequestEventRow {
  id: number;
  request_id: number;
  from_status: ServiceRequestRow['status'] | null;
  to_status: ServiceRequestRow['status'];
  note: string | null;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
}

export const serviceRequestRepository = {
  async findById(id: number): Promise<ServiceRequestRow | null> {
    const db = await getDb();
    const rows = await db.query<ServiceRequestRow>(
      `SELECT sr.*, st.name as service_name, u.full_name as user_full_name
       FROM service_requests sr
       LEFT JOIN service_types st ON st.id = sr.service_type_id
       LEFT JOIN users u ON u.id = sr.user_id
       WHERE sr.id = ? LIMIT 1`, [id]
    );
    return rows[0] ?? null;
  },

  async findByRequestNumber(num: string): Promise<ServiceRequestRow | null> {
    const db = await getDb();
    const rows = await db.query<ServiceRequestRow>(
      `SELECT sr.*, st.name as service_name, u.full_name as user_full_name
       FROM service_requests sr
       LEFT JOIN service_types st ON st.id = sr.service_type_id
       LEFT JOIN users u ON u.id = sr.user_id
       WHERE sr.request_number = ? LIMIT 1`, [num]
    );
    return rows[0] ?? null;
  },

  async create(params: {
    requestNumber: string;
    serviceTypeId: number;
    userId: number;
    purpose: string;
    notes?: string | null;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO service_requests (request_number, service_type_id, user_id, purpose, notes, status)
       VALUES (?, ?, ?, ?, ?, 'diajukan')`,
      [params.requestNumber, params.serviceTypeId, params.userId, params.purpose, params.notes ?? null]
    );
    return normalizeInsertId(result);
  },

  async addEvent(params: {
    requestId: number;
    fromStatus: ServiceRequestRow['status'] | null;
    toStatus: ServiceRequestRow['status'];
    note?: string | null;
    createdById: number;
  }): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT INTO service_request_events (request_id, from_status, to_status, note, created_by_id)
       VALUES (?, ?, ?, ?, ?)`,
      [params.requestId, params.fromStatus, params.toStatus, params.note ?? null, params.createdById]
    );
  },

  async updateStatus(
    id: number,
    status: ServiceRequestRow['status'],
    processedById?: number,
    rejectionReason?: string | null
  ): Promise<void> {
    const db = await getDb();
    const sets: string[] = ['status = ?'];
    const values: QueryParams = [status];
    if (processedById !== undefined) {
      sets.push('processed_by_id = ?');
      values.push(processedById);
      sets.push('processed_at = CURRENT_TIMESTAMP');
    }
    if (rejectionReason !== undefined) {
      sets.push('rejection_reason = ?');
      values.push(rejectionReason);
    }
    if (status === 'selesai') {
      sets.push('completed_at = CURRENT_TIMESTAMP');
    }
    values.push(id);
    await db.execute(`UPDATE service_requests SET ${sets.join(', ')} WHERE id = ?`, values);
  },

  async listEvents(requestId: number): Promise<ServiceRequestEventRow[]> {
    const db = await getDb();
    return db.query<ServiceRequestEventRow>(
      `SELECT e.*, u.full_name as created_by_name
       FROM service_request_events e
       LEFT JOIN users u ON u.id = e.created_by_id
       WHERE e.request_id = ? ORDER BY e.created_at ASC`, [requestId]
    );
  },

  async listAttachments(requestId: number): Promise<ServiceRequestAttachmentRow[]> {
    const db = await getDb();
    return db.query<ServiceRequestAttachmentRow>(
      'SELECT * FROM service_request_attachments WHERE request_id = ? ORDER BY uploaded_at ASC',
      [requestId]
    );
  },

  async addAttachment(params: {
    requestId: number;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO service_request_attachments (request_id, file_name, file_path, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [params.requestId, params.fileName, params.filePath, params.mimeType, params.fileSize]
    );
    return normalizeInsertId(result);
  },

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    userId?: number;
    serviceTypeId?: number;
  }): Promise<{ rows: ServiceRequestRow[]; total: number }> {
    const db = await getDb();
    const where: string[] = [];
    const values: QueryParams = [];
    if (params.userId) {
      where.push('sr.user_id = ?');
      values.push(params.userId);
    }
    if (params.serviceTypeId) {
      where.push('sr.service_type_id = ?');
      values.push(params.serviceTypeId);
    }
    if (params.status) {
      where.push('sr.status = ?');
      values.push(params.status);
    }
    if (params.search) {
      where.push('(sr.request_number LIKE ? OR sr.purpose LIKE ? OR u.full_name LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM service_requests sr LEFT JOIN users u ON u.id = sr.user_id ${whereSql}`, values
    );
    const total = totalRows[0]?.count ?? 0;
    const offset = (params.page - 1) * params.limit;
    const rows = await db.query<ServiceRequestRow>(
      `SELECT sr.*, st.name as service_name, u.full_name as user_full_name
       FROM service_requests sr
       LEFT JOIN service_types st ON st.id = sr.service_type_id
       LEFT JOIN users u ON u.id = sr.user_id
       ${whereSql}
       ORDER BY sr.created_at DESC LIMIT ? OFFSET ?`,
      [...values, params.limit, offset]
    );
    return { rows, total };
  },

  async countByStatus(status: string): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM service_requests WHERE status = ?', [status]);
    return rows[0]?.count ?? 0;
  },

  async countByUser(userId: number): Promise<number> {
    const db = await getDb();
    const rows = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM service_requests WHERE user_id = ?', [userId]);
    return rows[0]?.count ?? 0;
  },
};
