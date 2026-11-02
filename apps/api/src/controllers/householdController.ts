// Household (Kartu Keluarga) controller
// Endpoint CRUD KK & anggota, dengan masking data sensitif untuk warga

import type { Request, Response } from 'express';
import { z } from 'zod';
import { householdRepository, type HouseholdMemberRow, type HouseholdListRow } from '../repositories/householdRepository';
import { residentRepository } from '../repositories/residentRepository';
import { ok, created, fail, notFound, forbidden, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import {
  parsePagination,
  formatZodErrors,
  kkSchema,
  rtRwSchema,
} from '../validators/common';
import type { HouseholdRole } from '@sipedes/shared';

// -----------------------------------------------------
// Skema validasi
// -----------------------------------------------------

const householdRoleSchema = z.enum([
  'kepala', 'istri', 'anak', 'cucu', 'orang_tua',
  'famili_lain', 'pembantu', 'lainnya',
]);

const createHouseholdSchema = z.object({
  kkNumber: kkSchema.optional(),
  address: z.string().min(3, 'Alamat minimal 3 karakter').max(255, 'Alamat maksimal 255 karakter'),
  rt: rtRwSchema.optional(),
  rw: rtRwSchema.optional(),
  dusun: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  headResidentId: z.number().int().positive().optional().nullable(),
});

const updateHouseholdSchema = createHouseholdSchema.partial();

const addMemberSchema = z.object({
  residentId: z.number().int().positive('Resident ID wajib diisi'),
  role: householdRoleSchema,
  isHead: z.boolean().optional(),
});

const updateMemberSchema = z.object({
  role: householdRoleSchema.optional(),
  isHead: z.boolean().optional(),
});

const setHeadSchema = z.object({
  residentId: z.number().int().positive('Resident ID wajib diisi'),
});

// -----------------------------------------------------
// Helper: masking data sensitif
// -----------------------------------------------------

function maskNik(nik: string | null): string | null {
  if (!nik) return null;
  if (nik.length < 8) return '****';
  // Format: 4 digit awal + 8 bintang + 4 digit akhir (total 16 karakter)
  return `${nik.slice(0, 4)}********${nik.slice(-4)}`;
}

function maskKkNumber(kk: string | null): string | null {
  if (!kk) return null;
  if (kk.length < 8) return '****';
  // Format sederhana: 4 digit awal + dash + 4 digit akhir
  return `${kk.slice(0, 4)}-****-${kk.slice(-4)}`;
}

function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

// Format anggota untuk dikembalikan ke warga - mask NIK, filter phone
function formatMemberForWarga(member: HouseholdMemberRow): Record<string, unknown> {
  return {
    id: member.id,
    householdId: member.household_id,
    residentId: member.resident_id,
    role: member.role,
    isHead: member.is_head === 1,
    fullName: member.full_name,
    gender: member.gender,
    birthDate: member.birth_date,
    phone: member.phone_published === 1 ? member.phone : null,
    phonePublished: member.phone_published === 1,
    status: member.status,
    nikMasked: maskNik(member.nik),
    userId: member.user_id,
  };
}

// Format anggota lengkap untuk staff (tetap mask NIK sesuai aturan privasi)
function formatMemberForStaff(member: HouseholdMemberRow): Record<string, unknown> {
  return {
    id: member.id,
    householdId: member.household_id,
    residentId: member.resident_id,
    role: member.role,
    isHead: member.is_head === 1,
    fullName: member.full_name,
    gender: member.gender,
    birthDate: member.birth_date,
    phone: member.phone,
    phonePublished: member.phone_published === 1,
    status: member.status,
    nik: member.nik,
    nikMasked: maskNik(member.nik),
    userId: member.user_id,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };
}

// Format household ringkasan
function formatHouseholdRow(row: HouseholdListRow, staff: boolean): Record<string, unknown> {
  return {
    id: row.id,
    kkNumber: staff ? row.kk_number : null,
    kkNumberMasked: row.kk_number ? maskKkNumber(row.kk_number) : null,
    address: row.address,
    rt: row.rt,
    rw: row.rw,
    dusun: row.dusun,
    headResidentId: row.head_resident_id,
    headName: row.head_name ?? null,
    memberCount: row.member_count,
    notes: staff ? row.notes : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const householdController = {
  // List semua KK (staff)
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await householdRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      rt: req.query.rt as string | undefined,
      rw: req.query.rw as string | undefined,
      dusun: req.query.dusun as string | undefined,
    });
    const staff = isStaff(req.user?.role);
    return paginated(res, rows.map((r) => formatHouseholdRow(r, staff)), page, limit, total, 'OK');
  }),

  // Ambil satu KK by id beserta anggota (staff)
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const household = await householdRepository.findByIdWithDetails(id);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');
    const members = await householdRepository.listMembers(id);
    const staff = isStaff(req.user?.role);
    return ok(res, {
      ...formatHouseholdRow(household, staff),
      members: members.map((m) => formatMemberForStaff(m)),
    }, 'OK');
  }),

  // Buat KK baru (admin)
  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createHouseholdSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;
    // Validasi headResidentId jika ada
    if (data.headResidentId) {
      const headResident = await residentRepository.findById(data.headResidentId);
      if (!headResident) {
        return fail(res, 'Resident kepala keluarga tidak ditemukan', 422);
      }
    }
    const id = await householdRepository.create({
      kkNumber: data.kkNumber === '' ? null : data.kkNumber,
      address: data.address,
      rt: data.rt === '' ? null : data.rt,
      rw: data.rw === '' ? null : data.rw,
      dusun: data.dusun === '' ? null : data.dusun,
      notes: data.notes === '' ? null : data.notes,
      headResidentId: data.headResidentId ?? null,
    });

    // Jika headResidentId disertakan, otomatis tambahkan sebagai anggota kepala
    if (data.headResidentId) {
      await householdRepository.addMember({
        householdId: id,
        residentId: data.headResidentId,
        role: 'kepala',
        isHead: true,
      });
    }

    const createdRow = await householdRepository.findByIdWithDetails(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_HOUSEHOLD',
      entity: 'households',
      entityId: id,
      description: `Membuat Kartu Keluarga: ${data.address}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Kartu Keluarga berhasil dibuat');
  }),

  // Perbarui KK (admin)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await householdRepository.findById(id);
    if (!existing) return notFound(res, 'Kartu Keluarga tidak ditemukan');

    const parsed = updateHouseholdSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    if (data.headResidentId) {
      const headResident = await residentRepository.findById(data.headResidentId);
      if (!headResident) {
        return fail(res, 'Resident kepala keluarga tidak ditemukan', 422);
      }
    }

    await householdRepository.update(id, {
      kkNumber: data.kkNumber === '' ? null : data.kkNumber,
      address: data.address,
      rt: data.rt === '' ? null : data.rt,
      rw: data.rw === '' ? null : data.rw,
      dusun: data.dusun === '' ? null : data.dusun,
      notes: data.notes === '' ? null : data.notes,
      headResidentId: data.headResidentId,
    });

    const updated = await householdRepository.findByIdWithDetails(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_HOUSEHOLD',
      entity: 'households',
      entityId: id,
      description: `Memperbarui Kartu Keluarga: ${updated?.address ?? existing.address}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Kartu Keluarga berhasil diperbarui');
  }),

  // Hapus KK (admin)
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await householdRepository.findById(id);
    if (!existing) return notFound(res, 'Kartu Keluarga tidak ditemukan');
    await householdRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_HOUSEHOLD',
      entity: 'households',
      entityId: id,
      description: `Menghapus Kartu Keluarga: ${existing.address}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Kartu Keluarga berhasil dihapus');
  }),

  // Tambah anggota KK (admin)
  addMember: asyncHandler(async (req: Request, res: Response) => {
    const householdId = parseInt(req.params.id, 10);
    if (Number.isNaN(householdId)) return fail(res, 'ID tidak valid', 422);
    const household = await householdRepository.findById(householdId);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');

    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Validasi resident exists
    const resident = await residentRepository.findById(data.residentId);
    if (!resident) {
      return fail(res, 'Profil warga tidak ditemukan', 422);
    }

    // Cek apakah resident sudah jadi anggota KK lain
    const existingHousehold = await householdRepository.findByResidentId(data.residentId);
    if (existingHousehold && existingHousehold.id !== householdId) {
      return fail(res, 'Warga sudah terdaftar di Kartu Keluarga lain. Hapus dulu dari KK sebelumnya.', 422);
    }

    const memberId = await householdRepository.addMember({
      householdId,
      residentId: data.residentId,
      role: data.role as HouseholdRole,
      isHead: data.isHead ?? false,
    });

    // Jika isHead=true, set sebagai kepala keluarga
    if (data.isHead) {
      await householdRepository.setHead(householdId, data.residentId);
    }

    const members = await householdRepository.listMembers(householdId);
    await logActivity({
      userId: req.user!.sub,
      action: 'ADD_HOUSEHOLD_MEMBER',
      entity: 'household_members',
      entityId: memberId,
      description: `Menambah anggota KK #${householdId}: ${resident.full_name} (${data.role})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, members.map((m) => formatMemberForStaff(m)), 'Anggota berhasil ditambahkan');
  }),

  // Perbarui role anggota (admin)
  updateMember: asyncHandler(async (req: Request, res: Response) => {
    const householdId = parseInt(req.params.id, 10);
    const memberId = parseInt(req.params.mid, 10);
    if (Number.isNaN(householdId) || Number.isNaN(memberId)) {
      return fail(res, 'ID tidak valid', 422);
    }
    const household = await householdRepository.findById(householdId);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');
    const member = await householdRepository.findMemberById(memberId);
    if (!member || member.household_id !== householdId) {
      return notFound(res, 'Anggota tidak ditemukan dalam KK ini');
    }

    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    await householdRepository.updateMember(memberId, {
      role: data.role as HouseholdRole | undefined,
      isHead: data.isHead,
    });

    // Jika isHead=true, set sebagai kepala keluarga
    if (data.isHead) {
      await householdRepository.setHead(householdId, member.resident_id);
    }

    const members = await householdRepository.listMembers(householdId);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_HOUSEHOLD_MEMBER',
      entity: 'household_members',
      entityId: memberId,
      description: `Memperbarui anggota KK #${householdId}: ${member.full_name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, members.map((m) => formatMemberForStaff(m)), 'Anggota berhasil diperbarui');
  }),

  // Hapus anggota dari KK (admin)
  removeMember: asyncHandler(async (req: Request, res: Response) => {
    const householdId = parseInt(req.params.id, 10);
    const memberId = parseInt(req.params.mid, 10);
    if (Number.isNaN(householdId) || Number.isNaN(memberId)) {
      return fail(res, 'ID tidak valid', 422);
    }
    const household = await householdRepository.findById(householdId);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');
    const member = await householdRepository.findMemberById(memberId);
    if (!member || member.household_id !== householdId) {
      return notFound(res, 'Anggota tidak ditemukan dalam KK ini');
    }

    await householdRepository.removeMember(memberId);

    const members = await householdRepository.listMembers(householdId);
    await logActivity({
      userId: req.user!.sub,
      action: 'REMOVE_HOUSEHOLD_MEMBER',
      entity: 'household_members',
      entityId: memberId,
      description: `Menghapus anggota KK #${householdId}: ${member.full_name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, members.map((m) => formatMemberForStaff(m)), 'Anggota berhasil dihapus');
  }),

  // Set kepala keluarga (admin)
  setHead: asyncHandler(async (req: Request, res: Response) => {
    const householdId = parseInt(req.params.id, 10);
    if (Number.isNaN(householdId)) return fail(res, 'ID tidak valid', 422);
    const household = await householdRepository.findById(householdId);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');

    const parsed = setHeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const { residentId } = parsed.data;

    // Validasi resident adalah anggota KK ini
    const currentMembers = await householdRepository.listMembers(householdId);
    const member = currentMembers.find((m) => m.resident_id === residentId);
    if (!member) {
      return fail(res, 'Warga tersebut bukan anggota KK ini. Tambahkan dulu sebagai anggota.', 422);
    }

    await householdRepository.setHead(householdId, residentId);
    const updated = await householdRepository.findByIdWithDetails(householdId);
    const members = await householdRepository.listMembers(householdId);
    await logActivity({
      userId: req.user!.sub,
      action: 'SET_HOUSEHOLD_HEAD',
      entity: 'households',
      entityId: householdId,
      description: `Menetapkan kepala keluarga KK #${householdId}: ${member.full_name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, {
      ...(updated ? formatHouseholdRow(updated, isStaff(req.user?.role)) : { id: householdId }),
      members: members.map((m) => formatMemberForStaff(m)),
    }, 'Kepala keluarga berhasil ditetapkan');
  }),

  // Ambil KK milik warga yang login (auth - warga)
  getMyHousehold: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return forbidden(res, 'Tidak terautentikasi');
    const myResident = await residentRepository.findByUserId(req.user.sub);
    if (!myResident) return notFound(res, 'Profil warga tidak ditemukan');
    // Cari KK berdasarkan keanggotaan resident di tabel household_members
    const householdBasic = await householdRepository.findByResidentId(myResident.id);
    if (!householdBasic) {
      return notFound(res, 'Anda belum terdaftar dalam Kartu Keluarga manapun');
    }
    const household = await householdRepository.findByIdWithDetails(householdBasic.id);
    if (!household) return notFound(res, 'Kartu Keluarga tidak ditemukan');
    const members = await householdRepository.listMembers(householdBasic.id);
    return ok(res, {
      ...formatHouseholdRow(household, false),
      members: members.map((m) => formatMemberForWarga(m)),
      myResidentId: myResident.id,
    }, 'OK');
  }),
};
