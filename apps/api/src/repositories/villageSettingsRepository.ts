// Village settings repository

import { getDb } from '../db/connection';
import type { QueryParams } from '../db/types';

export interface VillageSettingsRow {
  id: number;
  village_name: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  history: string | null;
  vision: string | null;
  mission: string | null;
  geography: string | null;
  potential: string | null;
  working_hours: string | null;
  map_embed: string | null;
  updated_at: string;
}

export const villageSettingsRepository = {
  async get(): Promise<VillageSettingsRow | null> {
    const db = await getDb();
    const rows = await db.query<VillageSettingsRow>('SELECT * FROM village_settings ORDER BY id LIMIT 1');
    return rows[0] ?? null;
  },

  async upsert(params: Partial<VillageSettingsRow> & { villageName: string }): Promise<number> {
    const db = await getDb();
    const existing = await this.get();
    const cols: Array<keyof VillageSettingsRow> = [
      'village_name','district','regency','province','address','postal_code','phone','email',
      'website','logo_url','history','vision','mission','geography','potential','working_hours','map_embed'
    ];
    const snakeMap: Record<string, string> = {
      villageName: 'village_name', postalCode: 'postal_code', logoUrl: 'logo_url',
      workingHours: 'working_hours', mapEmbed: 'map_embed',
    };
    if (!existing) {
      const colsToInsert = cols.filter((c) => {
        const camel = Object.entries(snakeMap).find(([, v]) => v === c)?.[0] ?? c;
        return (params as Record<string, unknown>)[camel as string] !== undefined || c === 'village_name';
      });
      const placeholders = colsToInsert.map(() => '?').join(', ');
      const values: QueryParams = colsToInsert.map((c) => {
        const camel = Object.entries(snakeMap).find(([, v]) => v === c)?.[0] ?? c;
        return (params as Record<string, unknown>)[camel as string] as QueryParams[number] ?? null;
      });
      const result = await db.execute(
        `INSERT INTO village_settings (${colsToInsert.join(', ')}) VALUES (${placeholders})`,
        values
      );
      return Number((result as { insertId?: number }).insertId ?? 0);
    }
    const sets: string[] = [];
    const values: QueryParams = [];
    for (const col of cols) {
      const camel = Object.entries(snakeMap).find(([, v]) => v === col)?.[0] ?? col;
      const val = (params as Record<string, unknown>)[camel as string];
      if (val !== undefined) {
        sets.push(`${col} = ?`);
        values.push(val as QueryParams[number]);
      }
    }
    if (sets.length > 0) {
      values.push(existing.id);
      await db.execute(`UPDATE village_settings SET ${sets.join(', ')} WHERE id = ?`, values);
    }
    return existing.id;
  },
};
