// Activity logger - catat aktivitas administratif tanpa token/password

import { getDb } from '../db/connection';
import type { QueryParams } from '../db/types';

export async function logActivity(params: {
  userId?: number | null;
  action: string;
  entity?: string | null;
  entityId?: number | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const db = await getDb();
    const sql = `
      INSERT INTO activity_logs (user_id, action, entity, entity_id, description, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values: QueryParams = [
      params.userId ?? null,
      params.action,
      params.entity ?? null,
      params.entityId ?? null,
      params.description ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ];
    await db.execute(sql, values);
  } catch (err) {
    // Logging gagal tidak boleh memblokir operasi utama
    console.error('[activity_log] gagal mencatat:', err);
  }
}
