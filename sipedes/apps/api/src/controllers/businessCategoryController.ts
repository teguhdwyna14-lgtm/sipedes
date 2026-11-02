// Business category controller
// CRUD kategori jasa & usaha warga

import type { Request, Response } from 'express';
import { z } from 'zod';
import { businessCategoryRepository, type BusinessCategoryRow } from '../repositories/businessCategoryRepository';
import { ok, created, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { slugify } from '../utils/auth';
import { parsePagination, formatZodErrors, slugSchema } from '../validators/common';

// -----------------------------------------------------
// Skema validasi
// -----------------------------------------------------

const createCategorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter').max(100, 'Nama kategori maksimal 100 karakter'),
  slug: slugSchema,
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

const updateCategorySchema = createCategorySchema.partial();

// Helper: format row ke response
function formatRow(row: BusinessCategoryRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    active: row.active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const businessCategoryController = {
  // List kategori aktif (publik)
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await businessCategoryRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      activeOnly: true,
    });
    return paginated(res, rows.map(formatRow), page, limit, total, 'OK');
  }),

  // List semua kategori (staff)
  listAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await businessCategoryRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      activeOnly: req.query.active === 'true',
    });
    return paginated(res, rows.map(formatRow), page, limit, total, 'OK');
  }),

  // Ambil satu kategori by id atau slug (publik)
  get: asyncHandler(async (req: Request, res: Response) => {
    const identifier = req.params.id;
    let row: BusinessCategoryRow | null = null;
    // Jika identifier angka, cari by id; jika bukan, cari by slug
    if (/^\d+$/.test(identifier)) {
      row = await businessCategoryRepository.findById(parseInt(identifier, 10));
    } else {
      row = await businessCategoryRepository.findBySlug(identifier);
    }
    if (!row) return notFound(res, 'Kategori tidak ditemukan');
    return ok(res, formatRow(row), 'OK');
  }),

  // Buat kategori baru (admin)
  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Jika slug tidak diberikan, generate dari name
    const slug = data.slug && data.slug.length > 0 ? data.slug : slugify(data.name);

    // Cek duplikasi name & slug
    const existingBySlug = await businessCategoryRepository.findBySlug(slug);
    if (existingBySlug) {
      return fail(res, 'Slug sudah digunakan kategori lain', 422);
    }

    const id = await businessCategoryRepository.create({
      name: data.name,
      slug,
      icon: data.icon === '' ? null : data.icon,
      description: data.description === '' ? null : data.description,
      sortOrder: data.sortOrder,
      active: data.active,
    });

    const createdRow = await businessCategoryRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_BUSINESS_CATEGORY',
      entity: 'business_categories',
      entityId: id,
      description: `Membuat kategori usaha: ${data.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow ? formatRow(createdRow) : null, 'Kategori berhasil dibuat');
  }),

  // Perbarui kategori (admin)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await businessCategoryRepository.findById(id);
    if (!existing) return notFound(res, 'Kategori tidak ditemukan');

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Cek duplikasi slug jika diubah
    if (data.slug && data.slug.length > 0 && data.slug !== existing.slug) {
      const bySlug = await businessCategoryRepository.findBySlug(data.slug);
      if (bySlug && bySlug.id !== id) {
        return fail(res, 'Slug sudah digunakan kategori lain', 422);
      }
    }

    // Jika name diubah & slug tidak diubah, regenerasi slug dari name baru
    let finalSlug: string | undefined = data.slug;
    if (data.name && !data.slug) {
      finalSlug = slugify(data.name);
      const bySlug = await businessCategoryRepository.findBySlug(finalSlug);
      if (bySlug && bySlug.id !== id) {
        return fail(res, 'Slug hasil generate dari nama sudah digunakan kategori lain', 422);
      }
    }

    await businessCategoryRepository.update(id, {
      name: data.name,
      slug: finalSlug === '' ? undefined : finalSlug,
      icon: data.icon === '' ? null : data.icon,
      description: data.description === '' ? null : data.description,
      sortOrder: data.sortOrder,
      active: data.active,
    });

    const updated = await businessCategoryRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_BUSINESS_CATEGORY',
      entity: 'business_categories',
      entityId: id,
      description: `Memperbarui kategori usaha: ${updated?.name ?? existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated ? formatRow(updated) : null, 'Kategori berhasil diperbarui');
  }),

  // Hapus kategori (admin) - tolak jika masih dipakai business
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await businessCategoryRepository.findById(id);
    if (!existing) return notFound(res, 'Kategori tidak ditemukan');

    // Cek apakah masih ada business yang memakai kategori ini
    const count = await businessCategoryRepository.countBusinesses(id);
    if (count > 0) {
      return fail(res, `Kategori tidak dapat dihapus karena masih dipakai oleh ${count} usaha`, 400);
    }

    await businessCategoryRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_BUSINESS_CATEGORY',
      entity: 'business_categories',
      entityId: id,
      description: `Menghapus kategori usaha: ${existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Kategori berhasil dihapus');
  }),
};
