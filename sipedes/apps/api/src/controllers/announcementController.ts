// Announcement controller - CRUD pengumuman untuk admin/petugas

import type { Request, Response } from 'express';
import { z } from 'zod';
import { announcementRepository, type AnnouncementRow } from '../repositories/announcementRepository';
import { ok, created, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { parsePagination, formatZodErrors } from '../validators/common';

// Skema validasi pembuatan pengumuman
const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255),
  content: z.string().min(1, 'Konten wajib diisi'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  pinned: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
});

// Skema validasi pembaruan pengumuman
const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementController = {
  // List semua pengumuman (staff) dengan filter
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await announcementRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      status: req.query.status as AnnouncementRow['status'] | undefined,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu pengumuman by id (staff)
  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const item = await announcementRepository.findById(id);
    if (!item) return notFound(res, 'Pengumuman tidak ditemukan');
    return ok(res, item, 'OK');
  }),

  // Buat pengumuman baru (staff)
  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;
    const id = await announcementRepository.create({
      title: data.title,
      content: data.content,
      status: data.status,
      pinned: data.pinned,
      authorId: req.user!.sub,
      expiresAt: data.expiresAt ?? null,
    });
    const createdRow = await announcementRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'announcements',
      entityId: id,
      description: `Membuat pengumuman: ${data.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Pengumuman berhasil dibuat');
  }),

  // Perbarui pengumuman (staff)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await announcementRepository.findById(id);
    if (!existing) return notFound(res, 'Pengumuman tidak ditemukan');

    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    await announcementRepository.update(id, {
      title: data.title,
      content: data.content,
      status: data.status,
      pinned: data.pinned,
      expiresAt: data.expiresAt,
    });

    const updated = await announcementRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_ANNOUNCEMENT',
      entity: 'announcements',
      entityId: id,
      description: `Memperbarui pengumuman: ${updated?.title ?? existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Pengumuman berhasil diperbarui');
  }),

  // Hapus pengumuman (admin)
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await announcementRepository.findById(id);
    if (!existing) return notFound(res, 'Pengumuman tidak ditemukan');
    await announcementRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_ANNOUNCEMENT',
      entity: 'announcements',
      entityId: id,
      description: `Menghapus pengumuman: ${existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Pengumuman berhasil dihapus');
  }),
};
