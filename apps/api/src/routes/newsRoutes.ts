// News routes - publik untuk baca, staff untuk CRUD

import { Router } from 'express';
import type { Request, Response } from 'express';
import { newsRepository } from '../repositories/newsRepository';
import { newsController } from '../controllers/newsController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';
import { ok, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { parsePagination } from '../validators/common';

export const newsRouter = Router();

// -----------------------------------------------------
// Route admin/staff CRUD - didaftarkan SEBELUM route :slug
// agar /admin tidak tertangkap oleh :slug.
// -----------------------------------------------------

// List semua berita (staff) dengan filter
newsRouter.get('/admin', authenticate, requireStaff, newsController.list);

// Ambil satu berita by id (staff)
newsRouter.get('/admin/:id', authenticate, requireStaff, newsController.getById);

// Buat berita baru (staff)
newsRouter.post('/', authenticate, requireStaff, newsController.create);

// Perbarui berita (staff)
newsRouter.put('/:id', authenticate, requireStaff, newsController.update);

// Hapus berita (admin)
newsRouter.delete('/:id', authenticate, requireRole('admin'), newsController.remove);

// -----------------------------------------------------
// Route publik (baca berita yang sudah dipublikasi)
// -----------------------------------------------------

// List berita published (publik)
newsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);
  const { rows, total } = await newsRepository.list({
    page,
    limit,
    search: req.query.search as string | undefined,
    category: req.query.category as string | undefined,
    onlyPublished: true,
  });
  return paginated(res, rows, page, limit, total, 'OK');
}));

// Ambil satu berita by slug (publik, hanya yang published)
newsRouter.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const news = await newsRepository.findBySlug(req.params.slug);
  if (!news || news.status !== 'published') return notFound(res, 'Berita tidak ditemukan');
  return ok(res, news, 'OK');
}));
