// Resident controller - manajemen profil warga oleh staff

import type { Request, Response } from 'express';
import { z } from 'zod';
import { residentRepository, type ResidentRow } from '../repositories/residentRepository';
import { userRepository } from '../repositories/userRepository';
import { ok, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import {
  parsePagination,
  formatZodErrors,
  nikSchema,
  kkSchema,
  rtRwSchema,
  phoneSchema,
} from '../validators/common';

// -----------------------------------------------------
// Skema validasi
// -----------------------------------------------------

const verifySchema = z.object({
  status: z.enum(['active', 'rejected']),
  rejectionNote: z.string().max(500).optional().nullable(),
});

const updateResidentSchema = z.object({
  fullName: z.string().min(3, 'Nama lengkap minimal 3 karakter').max(150).optional(),
  nik: nikSchema.optional(),
  kkNumber: kkSchema.optional(),
  birthDate: z.string().datetime().optional().nullable(),
  gender: z.enum(['L', 'P']).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  rt: rtRwSchema.optional(),
  rw: rtRwSchema.optional(),
  phone: phoneSchema.optional(),
  occupation: z.string().max(150).optional().nullable(),
});

// -----------------------------------------------------
// Helper: masking data sensitif untuk list (jangan expose NIK/KK/phone/birthDate)
// -----------------------------------------------------

function maskResident(row: ResidentRow): ResidentRow {
  return {
    ...row,
    nik: row.nik ? maskDigits(row.nik) : null,
    kk_number: row.kk_number ? maskDigits(row.kk_number) : null,
    phone: row.phone ? maskPhone(row.phone) : null,
    birth_date: row.birth_date ? '****-**-**' : null,
  };
}

function maskDigits(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '****' + value.slice(-2);
}

function maskPhone(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 3) + '****' + value.slice(-2);
}

export const residentController = {
  // List semua resident (staff) - dengan masking data sensitif
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await residentRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      rt: req.query.rt as string | undefined,
      rw: req.query.rw as string | undefined,
    });
    const masked = rows.map(maskResident);
    return paginated(res, masked, page, limit, total, 'OK');
  }),

  // Ambil satu resident by id (staff) - data lengkap
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const resident = await residentRepository.findById(id);
    if (!resident) return notFound(res, 'Profil warga tidak ditemukan');
    // Ambil user info terkait
    const user = await userRepository.findPublicById(resident.user_id);
    return ok(res, { ...resident, user }, 'OK');
  }),

  // Verifikasi / tolak resident (staff)
  verify: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await residentRepository.findById(id);
    if (!existing) return notFound(res, 'Profil warga tidak ditemukan');

    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Jika menolak, rejectionNote wajib
    if (data.status === 'rejected' && !data.rejectionNote) {
      return fail(res, 'Alasan penolakan wajib diisi saat menolak verifikasi', 422);
    }

    await residentRepository.verify(id, req.user!.sub, data.status, data.rejectionNote ?? undefined);

    // Sinkronkan status user
    if (data.status === 'active') {
      await userRepository.updateStatus(existing.user_id, 'active');
    } else if (data.status === 'rejected') {
      await userRepository.updateStatus(existing.user_id, 'rejected');
    }

    await logActivity({
      userId: req.user!.sub,
      action: data.status === 'active' ? 'VERIFY_RESIDENT' : 'REJECT_RESIDENT',
      entity: 'resident_profiles',
      entityId: id,
      description: `${data.status === 'active' ? 'Memverifikasi' : 'Menolak'} profil warga: ${existing.full_name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const updated = await residentRepository.findById(id);
    return ok(res, updated, data.status === 'active' ? 'Warga berhasil diverifikasi' : 'Warga ditolak');
  }),

  // Update data resident (staff)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await residentRepository.findById(id);
    if (!existing) return notFound(res, 'Profil warga tidak ditemukan');

    const parsed = updateResidentSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    await residentRepository.update(id, {
      fullName: data.fullName,
      nik: data.nik === '' ? null : data.nik,
      kkNumber: data.kkNumber === '' ? null : data.kkNumber,
      birthDate: data.birthDate === '' ? null : data.birthDate,
      gender: data.gender,
      address: data.address,
      rt: data.rt === '' ? null : data.rt,
      rw: data.rw === '' ? null : data.rw,
      phone: data.phone === '' ? null : data.phone,
      occupation: data.occupation,
    });

    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_RESIDENT',
      entity: 'resident_profiles',
      entityId: id,
      description: `Memperbarui profil warga: ${existing.full_name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const updated = await residentRepository.findById(id);
    return ok(res, updated, 'Profil warga berhasil diperbarui');
  }),
};
