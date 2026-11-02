// Announcement routes - publik untuk baca, staff untuk CRUD

import { Router } from 'express';
import type { Request, Response } from 'express';
import { announcementRepository } from '../repositories/announcementRepository';
import { announcementController } from '../controllers/announcementController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';
import { ok, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { parsePagination } from '../validators/common';

export const announcementRouter = Router();

// -----------------------------------------------------
// Route admin/staff CRUD - didaftarkan SEBELUM route :id
// agar /admin tidak tertangkap oleh :id.
// -----------------------------------------------------

// List semua pengumuman (staff) dengan filter
announcementRouter.get('/admin', authenticate, requireStaff, announcementController.list);

// Ambil satu pengumuman by id (staff)
announcementRouter.get('/admin/:id', authenticate, requireStaff, announcementController.getById);

// Buat pengumuman baru (staff)
announcementRouter.post('/', authenticate, requireStaff, announcementController.create);

// Perbarui pengumuman (staff)
announcementRouter.put('/:id', authenticate, requireStaff, announcementController.update);

// Hapus pengumuman (admin)
announcementRouter.delete('/:id', authenticate, requireRole('admin'), announcementController.remove);

// -----------------------------------------------------
// Route publik (baca pengumuman yang sudah dipublikasi)
// -----------------------------------------------------

// List pengumuman published (publik)
announcementRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);
  const { rows, total } = await announcementRepository.list({
    page,
    limit,
    search: req.query.search as string | undefined,
    onlyPublished: true,
  });
  return paginated(res, rows, page, limit, total, 'OK');
}));

// Ambil satu pengumuman by id (publik, hanya yang published)
announcementRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return notFound(res, 'Pengumuman tidak ditemukan');
  const item = await announcementRepository.findById(id);
  if (!item || item.status !== 'published') return notFound(res, 'Pengumuman tidak ditemukan');
  return ok(res, item, 'OK');
}));
