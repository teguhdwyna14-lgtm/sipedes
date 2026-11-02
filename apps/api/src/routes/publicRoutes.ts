// Public routes - data yang bisa diakses tanpa login

import { Router } from 'express';
import type { Request, Response } from 'express';
import { newsRepository } from '../repositories/newsRepository';
import { announcementRepository } from '../repositories/announcementRepository';
import { serviceTypeRepository } from '../repositories/serviceRepository';
import { complaintRepository } from '../repositories/complaintRepository';
import { villageSettingsRepository } from '../repositories/villageSettingsRepository';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { parsePagination } from '../validators/common';

export const publicRouter = Router();

// Berita publik (hanya yang published)
publicRouter.get('/news', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { rows, total } = await newsRepository.list({
    page, limit,
    search: req.query.search as string | undefined,
    category: req.query.category as string | undefined,
    onlyPublished: true,
  });
  return res.json({ success: true, message: 'OK', data: { items: rows }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

publicRouter.get('/news/:slug', asyncHandler(async (req: Request, res: Response) => {
  const news = await newsRepository.findBySlug(req.params.slug);
  if (!news || news.status !== 'published') return res.status(404).json({ success: false, message: 'Berita tidak ditemukan' });
  return res.json({ success: true, message: 'OK', data: news });
}));

publicRouter.get('/announcements', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);
  const { rows, total } = await announcementRepository.list({
    page, limit,
    search: req.query.search as string | undefined,
    onlyPublished: true,
  });
  return res.json({ success: true, message: 'OK', data: { items: rows }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

publicRouter.get('/service-types', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = parsePagination(req.query as Record<string, unknown>);
  const { rows, total } = await serviceTypeRepository.list({
    page, limit,
    search: req.query.search as string | undefined,
    activeOnly: true,
  });
  return res.json({ success: true, message: 'OK', data: { items: rows }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

publicRouter.get('/village', asyncHandler(async (_req: Request, res: Response) => {
  const settings = await villageSettingsRepository.get();
  return res.json({ success: true, message: 'OK', data: settings });
}));

publicRouter.get('/news-categories', asyncHandler(async (_req: Request, res: Response) => {
  const categories = await newsRepository.listCategories();
  return res.json({ success: true, message: 'OK', data: categories });
}));

// Pelacakan pengaduan publik berdasarkan tracking_code
publicRouter.get('/complaints/track', asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) return fail(res, 'Parameter code wajib diisi', 400);
  const complaint = await complaintRepository.findByTrackingCode(code);
  if (!complaint) return fail(res, 'Pengaduan tidak ditemukan', 404);
  // Sembunyikan info pelapor jika anonim
  if (complaint.is_anonymous) {
    complaint.user_full_name = undefined;
    complaint.user_id = 0;
  }
  const updates = await complaintRepository.listUpdates(complaint.id);
  return res.json({ success: true, message: 'OK', data: { complaint, updates } });
}));
