// Complaint controller - pengaduan warga

import type { Request, Response } from 'express';
import { z } from 'zod';
import { complaintRepository, type ComplaintRow } from '../repositories/complaintRepository';
import { ok, created, fail, notFound, forbidden, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { generateTrackingCode } from '../utils/auth';
import { parsePagination, formatZodErrors } from '../validators/common';

// -----------------------------------------------------
// Validasi
// -----------------------------------------------------

const createComplaintSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(5000),
  category: z.string().max(100).optional().nullable(),
  isAnonymous: z.boolean().default(false),
});

const addUpdateSchema = z.object({
  status: z.enum(['baru', 'diterima', 'diproses', 'selesai', 'ditutup']),
  note: z.string().max(2000).optional().nullable(),
});

// Status transisi valid
const VALID_TRANSITIONS: Record<string, string[]> = {
  baru: ['diterima', 'diproses', 'selesai', 'ditutup'],
  diterima: ['diproses', 'selesai', 'ditutup'],
  diproses: ['selesai', 'ditutup'],
  selesai: ['ditutup'],
  ditutup: [],
};

// Helper: cek apakah user adalah staff
function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

export const complaintController = {
  // List pengaduan (warga: milik sendiri, staff: semua)
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const staff = isStaff(req.user?.role);
    const { rows, total } = await complaintRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      category: req.query.category as string | undefined,
      userId: staff ? undefined : req.user!.sub,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu pengaduan by id (dengan updates)
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const item = await complaintRepository.findById(id);
    if (!item) return notFound(res, 'Pengaduan tidak ditemukan');
    // Cek kepemilikan: warga hanya bisa lihat miliknya sendiri
    if (!isStaff(req.user?.role) && item.user_id !== req.user!.sub) {
      return forbidden(res, 'Anda tidak dapat mengakses pengaduan ini');
    }
    const updates = await complaintRepository.listUpdates(id);
    return ok(res, { ...item, updates }, 'OK');
  }),

  // Buat pengaduan baru (warga)
  create: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Generate tracking code unik
    let trackingCode = generateTrackingCode();
    let exists = await complaintRepository.findByTrackingCode(trackingCode);
    let attempts = 0;
    while (exists && attempts < 5) {
      trackingCode = generateTrackingCode();
      // eslint-disable-next-line no-await-in-loop
      exists = await complaintRepository.findByTrackingCode(trackingCode);
      attempts += 1;
    }

    const id = await complaintRepository.create({
      trackingCode,
      userId: req.user!.sub,
      title: data.title,
      description: data.description,
      category: data.category ?? null,
      isAnonymous: data.isAnonymous,
    });

    // Tambahkan update awal
    await complaintRepository.addUpdate({
      complaintId: id,
      status: 'baru',
      note: 'Pengaduan diterima',
      createdById: req.user!.sub,
    });

    const createdRow = await complaintRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_COMPLAINT',
      entity: 'complaints',
      entityId: id,
      description: `Membuat pengaduan ${trackingCode}: ${data.title}${data.isAnonymous ? ' (anonim)' : ''}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Pengaduan berhasil dibuat');
  }),

  // Tambah update status pengaduan (staff)
  addUpdate: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await complaintRepository.findById(id);
    if (!existing) return notFound(res, 'Pengaduan tidak ditemukan');

    const parsed = addUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Validasi transisi status
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (existing.status !== data.status && !allowed.includes(data.status)) {
      return fail(
        res,
        `Transisi status dari "${existing.status}" ke "${data.status}" tidak diizinkan`,
        422
      );
    }

    await complaintRepository.addUpdate({
      complaintId: id,
      status: data.status,
      note: data.note ?? null,
      createdById: req.user!.sub,
    });

    const updated = await complaintRepository.findById(id);
    const updates = await complaintRepository.listUpdates(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_COMPLAINT_STATUS',
      entity: 'complaints',
      entityId: id,
      description: `Memperbarui status pengaduan ${existing.tracking_code}: ${existing.status} -> ${data.status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, { complaint: updated, updates }, 'Status pengaduan berhasil diperbarui');
  }),

  // Pelacakan publik by tracking code (tidak butuh auth)
  track: asyncHandler(async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) return fail(res, 'Parameter code wajib diisi', 400);
    const complaint = await complaintRepository.findByTrackingCode(code);
    if (!complaint) return notFound(res, 'Pengaduan tidak ditemukan');
    // Sembunyikan info pelapor jika anonim
    let safe: ComplaintRow = complaint;
    if (complaint.is_anonymous) {
      safe = { ...complaint, user_full_name: undefined, user_id: 0 };
    }
    const updates = await complaintRepository.listUpdates(complaint.id);
    return ok(res, { complaint: safe, updates }, 'OK');
  }),
};
