// Business (Jasa & Usaha Warga) controller
// Endpoint CRUD usaha warga dengan kontrol akses horizontal

import type { Request, Response } from 'express';
import { z } from 'zod';
import { businessRepository, type BusinessRow } from '../repositories/businessRepository';
import { businessCategoryRepository } from '../repositories/businessCategoryRepository';
import { residentRepository } from '../repositories/residentRepository';
import { ok, created, fail, notFound, forbidden, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import {
  parsePagination,
  formatZodErrors,
  phoneSchema,
  rtRwSchema,
} from '../validators/common';
import type { BusinessStatus } from '@sipedes/shared';

// -----------------------------------------------------
// Skema validasi
// -----------------------------------------------------

const businessStatusSchema = z.enum(['pending', 'approved', 'rejected', 'disabled']);

const createBusinessSchema = z.object({
  categoryId: z.number().int().positive('Kategori wajib diisi'),
  name: z.string().min(3, 'Nama usaha minimal 3 karakter').max(150, 'Nama usaha maksimal 150 karakter'),
  description: z.string().max(2000).optional().nullable(),
  whatsapp: phoneSchema,
  whatsappPublished: z.boolean().default(true),
  address: z.string().max(255).optional().nullable(),
  rt: rtRwSchema.optional(),
  rw: rtRwSchema.optional(),
  photoUrl: z.string().url('URL foto tidak valid').max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  // Field khusus staff:
  ownerId: z.number().int().positive().optional(),
  status: businessStatusSchema.optional(),
});

const updateBusinessSchema = createBusinessSchema.partial().omit({ ownerId: true, status: true });

const updateStatusSchema = z.object({
  status: businessStatusSchema,
  rejectionNote: z.string().max(500).optional().nullable(),
});

// -----------------------------------------------------
// Helper
// -----------------------------------------------------

function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

// Format untuk publik: hide whatsapp jika tidak published, hide internal fields
function formatBusinessPublic(row: BusinessRow): Record<string, unknown> {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    name: row.name,
    description: row.description,
    whatsapp: row.whatsapp_published === 1 ? row.whatsapp : null,
    whatsappPublished: row.whatsapp_published === 1,
    address: row.address,
    rt: row.rt,
    rw: row.rw,
    photoUrl: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Format lengkap untuk staff
function formatBusinessAdmin(row: BusinessRow): Record<string, unknown> {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? null,
    ownerUserId: row.owner_user_id ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    name: row.name,
    description: row.description,
    whatsapp: row.whatsapp,
    whatsappPublished: row.whatsapp_published === 1,
    address: row.address,
    rt: row.rt,
    rw: row.rw,
    photoUrl: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    rejectionNote: row.rejection_note,
    approvedById: row.approved_by_id,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Format untuk owner (sama dengan admin tapi tanpa field staff-only tertentu)
function formatBusinessOwner(row: BusinessRow): Record<string, unknown> {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    name: row.name,
    description: row.description,
    whatsapp: row.whatsapp,
    whatsappPublished: row.whatsapp_published === 1,
    address: row.address,
    rt: row.rt,
    rw: row.rw,
    photoUrl: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    rejectionNote: row.rejection_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const businessController = {
  // List usaha yang sudah approved (publik)
  listPublic: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const categoryIdParam = req.query.categoryId as string | undefined;
    const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;
    if (categoryIdParam && (Number.isNaN(categoryId) || (categoryId && categoryId <= 0))) {
      return fail(res, 'categoryId tidak valid', 422);
    }
    const { rows, total } = await businessRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      categoryId,
      onlyApproved: true,
    });
    return paginated(res, rows.map(formatBusinessPublic), page, limit, total, 'OK');
  }),

  // Ambil satu usaha by id (publik, hanya approved)
  getPublic: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const business = await businessRepository.findById(id);
    if (!business) return notFound(res, 'Usaha tidak ditemukan');
    if (business.status !== 'approved') return notFound(res, 'Usaha tidak ditemukan');
    return ok(res, formatBusinessPublic(business), 'OK');
  }),

  // List semua usaha (staff)
  listAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const categoryIdParam = req.query.categoryId as string | undefined;
    const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;
    if (categoryIdParam && (Number.isNaN(categoryId) || (categoryId && categoryId <= 0))) {
      return fail(res, 'categoryId tidak valid', 422);
    }
    const { rows, total } = await businessRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      categoryId,
      status: req.query.status as BusinessStatus | undefined,
      ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string, 10) : undefined,
    });
    return paginated(res, rows.map(formatBusinessAdmin), page, limit, total, 'OK');
  }),

  // Ambil satu usaha by id (staff, full data)
  getAdmin: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const business = await businessRepository.findById(id);
    if (!business) return notFound(res, 'Usaha tidak ditemukan');
    return ok(res, formatBusinessAdmin(business), 'OK');
  }),

  // Buat usaha baru (auth - warga untuk diri sendiri atau staff)
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const parsed = createBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Validasi kategori
    const category = await businessCategoryRepository.findById(data.categoryId);
    if (!category) {
      return fail(res, 'Kategori tidak ditemukan', 422);
    }
    if (category.active !== 1) {
      return fail(res, 'Kategori tidak aktif', 422);
    }

    const staff = isStaff(req.user.role);
    let ownerId: number;
    let status: BusinessStatus;

    // Tentukan owner & status berdasarkan role
    if (staff && data.ownerId) {
      // Staff menentukan owner lain
      const ownerResident = await residentRepository.findById(data.ownerId);
      if (!ownerResident) {
        return fail(res, 'Profil warga owner tidak ditemukan', 422);
      }
      ownerId = data.ownerId;
      status = (data.status ?? 'pending') as BusinessStatus;
    } else {
      // Owner = resident profil milik user yang login
      const myResident = await residentRepository.findByUserId(req.user.sub);
      if (!myResident) {
        return fail(res, 'Profil warga Anda belum tersedia. Lengkapi profil terlebih dahulu.', 422);
      }
      ownerId = myResident.id;
      // Warga selalu membuat dengan status pending; staff tanpa ownerId juga pending
      status = 'pending';
    }

    const id = await businessRepository.create({
      ownerId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description === '' ? null : data.description,
      whatsapp: data.whatsapp === '' ? null : data.whatsapp,
      whatsappPublished: data.whatsappPublished,
      address: data.address === '' ? null : data.address,
      rt: data.rt === '' ? null : data.rt,
      rw: data.rw === '' ? null : data.rw,
      photoUrl: data.photoUrl === '' ? null : data.photoUrl,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      status,
    });

    const createdRow = await businessRepository.findById(id);
    await logActivity({
      userId: req.user.sub,
      action: 'CREATE_BUSINESS',
      entity: 'resident_businesses',
      entityId: id,
      description: `Mendaftarkan usaha: ${data.name} (status: ${status})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(
      res,
      createdRow ? formatBusinessOwner(createdRow) : null,
      'Usaha berhasil didaftarkan' + (status === 'pending' ? ', menunggu persetujuan petugas' : '')
    );
  }),

  // Perbarui usaha (auth - owner jika pending/rejected, atau staff)
  update: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await businessRepository.findById(id);
    if (!existing) return notFound(res, 'Usaha tidak ditemukan');

    const staff = isStaff(req.user.role);
    // Cek kepemilikan jika bukan staff
    if (!staff) {
      const myResident = await residentRepository.findByUserId(req.user.sub);
      if (!myResident || myResident.id !== existing.owner_id) {
        return forbidden(res, 'Anda tidak dapat mengubah usaha ini');
      }
      // Owner hanya bisa update jika status pending atau rejected
      if (existing.status !== 'pending' && existing.status !== 'rejected') {
        return fail(res, 'Usaha yang sudah disetujui/dinonaktifkan tidak dapat diubah oleh owner. Hubungi petugas.', 422);
      }
    }

    const parsed = updateBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    if (data.categoryId) {
      const category = await businessCategoryRepository.findById(data.categoryId);
      if (!category) {
        return fail(res, 'Kategori tidak ditemukan', 422);
      }
    }

    await businessRepository.update(id, {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description === '' ? null : data.description,
      whatsapp: data.whatsapp === '' ? null : data.whatsapp,
      whatsappPublished: data.whatsappPublished,
      address: data.address === '' ? null : data.address,
      rt: data.rt === '' ? null : data.rt,
      rw: data.rw === '' ? null : data.rw,
      photoUrl: data.photoUrl === '' ? null : data.photoUrl,
      latitude: data.latitude,
      longitude: data.longitude,
    });

    const updated = await businessRepository.findById(id);
    await logActivity({
      userId: req.user.sub,
      action: 'UPDATE_BUSINESS',
      entity: 'resident_businesses',
      entityId: id,
      description: `Memperbarui usaha: ${updated?.name ?? existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(
      res,
      updated ? (staff ? formatBusinessAdmin(updated) : formatBusinessOwner(updated)) : null,
      'Usaha berhasil diperbarui'
    );
  }),

  // Update status usaha (staff)
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await businessRepository.findById(id);
    if (!existing) return notFound(res, 'Usaha tidak ditemukan');

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // rejectionNote wajib jika status rejected
    if (data.status === 'rejected' && !data.rejectionNote) {
      return fail(res, 'Alasan penolakan wajib diisi saat menolak usaha', 422);
    }

    await businessRepository.updateStatus(id, data.status, req.user.sub, data.rejectionNote ?? null);

    const updated = await businessRepository.findById(id);
    await logActivity({
      userId: req.user.sub,
      action: `BUSINESS_${data.status.toUpperCase()}`,
      entity: 'resident_businesses',
      entityId: id,
      description: `Mengubah status usaha "${existing.name}" menjadi ${data.status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated ? formatBusinessAdmin(updated) : null, 'Status usaha berhasil diperbarui');
  }),

  // Hapus usaha (admin atau owner)
  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await businessRepository.findById(id);
    if (!existing) return notFound(res, 'Usaha tidak ditemukan');

    const staff = isStaff(req.user.role);
    // Admin bisa hapus semua; owner hanya hapus miliknya
    if (!staff) {
      const myResident = await residentRepository.findByUserId(req.user.sub);
      if (!myResident || myResident.id !== existing.owner_id) {
        return forbidden(res, 'Anda tidak dapat menghapus usaha ini');
      }
    }

    await businessRepository.delete(id);
    await logActivity({
      userId: req.user.sub,
      action: 'DELETE_BUSINESS',
      entity: 'resident_businesses',
      entityId: id,
      description: `Menghapus usaha: ${existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Usaha berhasil dihapus');
  }),

  // List usaha milik user yang login (auth - warga)
  listMine: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const myResident = await residentRepository.findByUserId(req.user.sub);
    if (!myResident) {
      return paginated(res, [], 1, 10, 0, 'OK');
    }
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await businessRepository.list({
      page,
      limit,
      ownerId: myResident.id,
      search: req.query.search as string | undefined,
    });
    return paginated(res, rows.map(formatBusinessOwner), page, limit, total, 'OK');
  }),
};
