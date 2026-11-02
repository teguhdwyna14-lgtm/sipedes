// User controller - manajemen pengguna oleh admin/staff

import type { Request, Response } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/userRepository';
import { residentRepository } from '../repositories/residentRepository';
import { getDb } from '../db/connection';
import { ok, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { parsePagination, formatZodErrors } from '../validators/common';

// Skema validasi update status user
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'rejected', 'disabled']),
});

// Skema validasi update role user
const updateRoleSchema = z.object({
  role: z.enum(['warga', 'petugas', 'admin']),
});

export const userController = {
  // List semua user (staff) dengan filter
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await userRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu user by id (staff)
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const user = await userRepository.findPublicById(id);
    if (!user) return notFound(res, 'Pengguna tidak ditemukan');
    // Sertakan profil resident jika ada
    const resident = await residentRepository.findByUserId(id);
    return ok(res, { ...user, resident }, 'OK');
  }),

  // Update status user (admin)
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await userRepository.findById(id);
    if (!existing) return notFound(res, 'Pengguna tidak ditemukan');

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const { status } = parsed.data;

    await userRepository.updateStatus(id, status);

    // Sinkronkan status profil resident
    const resident = await residentRepository.findByUserId(id);
    if (resident) {
      if (status === 'active') {
        // Verifikasi resident ikut aktif
        await residentRepository.verify(resident.id, req.user!.sub, 'active');
      } else if (status === 'rejected') {
        await residentRepository.update(resident.id, {
          status: 'rejected',
          verifiedById: req.user!.sub,
          rejectionNote: 'Status user ditolak oleh admin',
        });
      } else if (status === 'disabled') {
        await residentRepository.update(resident.id, { status: 'disabled' });
      } else if (status === 'pending') {
        await residentRepository.update(resident.id, { status: 'pending' });
      }
    }

    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_USER_STATUS',
      entity: 'users',
      entityId: id,
      description: `Mengubah status pengguna ${existing.email}: ${existing.status} -> ${status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const updated = await userRepository.findPublicById(id);
    return ok(res, updated, 'Status pengguna berhasil diperbarui');
  }),

  // Update role user (admin)
  updateRole: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await userRepository.findById(id);
    if (!existing) return notFound(res, 'Pengguna tidak ditemukan');

    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const { role } = parsed.data;

    // Cegah demosi diri sendiri jika itu adalah admin terakhir
    if (id === req.user!.sub && existing.role === 'admin' && role !== 'admin') {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        return fail(res, 'Tidak dapat menurunkan peran diri sendiri karena ini adalah admin terakhir', 400);
      }
    }

    // Update role user. userRepository tidak mengekspos metode updateRole,
    // jadi kita lakukan UPDATE langsung via koneksi DB.
    const db = await getDb();
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_USER_ROLE',
      entity: 'users',
      entityId: id,
      description: `Mengubah peran pengguna ${existing.email}: ${existing.role} -> ${role}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const updated = await userRepository.findPublicById(id);
    return ok(res, updated, 'Peran pengguna berhasil diperbarui');
  }),

  // Hapus user (admin) - cegah hapus diri sendiri
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    if (id === req.user!.sub) {
      return fail(res, 'Tidak dapat menghapus akun sendiri', 400);
    }
    const existing = await userRepository.findById(id);
    if (!existing) return notFound(res, 'Pengguna tidak ditemukan');

    // Cegah hapus admin terakhir
    if (existing.role === 'admin') {
      const adminCount = await userRepository.countByRole('admin');
      if (adminCount <= 1) {
        return fail(res, 'Tidak dapat menghapus admin terakhir', 400);
      }
    }

    await userRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_USER',
      entity: 'users',
      entityId: id,
      description: `Menghapus pengguna: ${existing.email}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Pengguna berhasil dihapus');
  }),
};
