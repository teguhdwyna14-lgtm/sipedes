// News controller - CRUD berita untuk admin/petugas

import type { Request, Response } from 'express';
import { z } from 'zod';
import { newsRepository, type NewsRow } from '../repositories/newsRepository';
import { ok, created, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { slugify } from '../utils/auth';
import { parsePagination, formatZodErrors } from '../validators/common';

// Skema validasi pembuatan berita
const createNewsSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255, 'Judul maksimal 255 karakter'),
  content: z.string().min(1, 'Konten wajib diisi'),
  excerpt: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url('URL gambar tidak valid').max(500).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

// Skema validasi pembaruan berita (semua field opsional)
const updateNewsSchema = createNewsSchema.partial();

// Helper: pastikan slug unik dengan menambahkan suffix -2, -3 dst.
async function ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
  let slug = baseSlug;
  let counter = 2;
  const MAX_ATTEMPTS = 100;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const bySlug = await newsRepository.findBySlug(slug);
    const conflict = excludeId ? bySlug && bySlug.id !== excludeId : bySlug;
    if (!conflict) return slug;
    // Generate slug baru dengan suffix counter
    const suffix = `-${counter}`;
    const maxBaseLen = 255 - suffix.length;
    slug = `${baseSlug.slice(0, maxBaseLen)}${suffix}`;
    counter += 1;
  }
  // Fallback: gunakan timestamp untuk menjamin keunikan
  return `${baseSlug.slice(0, 240)}-${Date.now()}`;
}

export const newsController = {
  // List semua berita (staff) dengan filter
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await newsRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      status: req.query.status as NewsRow['status'] | undefined,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu berita by id (staff)
  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const news = await newsRepository.findById(id);
    if (!news) return notFound(res, 'Berita tidak ditemukan');
    return ok(res, news, 'OK');
  }),

  // Buat berita baru (staff)
  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createNewsSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;
    const baseSlug = slugify(data.title);
    const slug = await ensureUniqueSlug(baseSlug);
    const id = await newsRepository.create({
      title: data.title,
      slug,
      excerpt: data.excerpt ?? null,
      content: data.content,
      category: data.category ?? null,
      imageUrl: data.imageUrl ?? null,
      status: data.status,
      authorId: req.user!.sub,
    });
    const createdRow = await newsRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_NEWS',
      entity: 'news',
      entityId: id,
      description: `Membuat berita: ${data.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Berita berhasil dibuat');
  }),

  // Perbarui berita (staff)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await newsRepository.findById(id);
    if (!existing) return notFound(res, 'Berita tidak ditemukan');

    const parsed = updateNewsSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Jika title berubah, generate slug baru
    let newSlug: string | undefined;
    if (data.title !== undefined && data.title !== existing.title) {
      const baseSlug = slugify(data.title);
      newSlug = await ensureUniqueSlug(baseSlug, id);
    }

    await newsRepository.update(id, {
      title: data.title,
      slug: newSlug,
      excerpt: data.excerpt,
      content: data.content,
      category: data.category,
      imageUrl: data.imageUrl,
      status: data.status,
    });

    const updated = await newsRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_NEWS',
      entity: 'news',
      entityId: id,
      description: `Memperbarui berita: ${updated?.title ?? existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Berita berhasil diperbarui');
  }),

  // Hapus berita (admin)
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await newsRepository.findById(id);
    if (!existing) return notFound(res, 'Berita tidak ditemukan');
    await newsRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_NEWS',
      entity: 'news',
      entityId: id,
      description: `Menghapus berita: ${existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Berita berhasil dihapus');
  }),
};
