// Village settings controller & route (gabung untuk simplifikasi)

import { Router } from 'express';
import type { Request, Response } from 'express';
import { villageSettingsRepository } from '../repositories/villageSettingsRepository';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { authenticate, requireStaff } from '../middleware/auth';
import { logActivity } from '../utils/activityLogger';

export const villageSettingsRouter = Router();

villageSettingsRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const settings = await villageSettingsRepository.get();
  if (!settings) {
    // Buat default jika belum ada
    const id = await villageSettingsRepository.upsert({ villageName: 'Desa Contoh' });
    const created = await villageSettingsRepository.get();
    return ok(res, created ?? { id }, 'Pengaturan desa');
  }
  return ok(res, settings, 'Pengaturan desa');
}));

villageSettingsRouter.put('/', authenticate, requireStaff, asyncHandler(async (req: Request, res: Response) => {
  try {
    const id = await villageSettingsRepository.upsert(req.body as Record<string, unknown> & { villageName: string });
    const updated = await villageSettingsRepository.get();
    await logActivity({
      userId: req.user?.sub,
      action: 'UPDATE_VILLAGE_SETTINGS',
      entity: 'village_settings',
      entityId: id,
      description: 'Memperbarui pengaturan identitas desa',
      ipAddress: req.ip ?? null,
    });
    return ok(res, updated, 'Pengaturan desa diperbarui');
  } catch (err) {
    return fail(res, (err as Error).message, 400);
  }
}));
