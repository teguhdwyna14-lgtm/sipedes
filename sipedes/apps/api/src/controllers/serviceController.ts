// Service controller - tipe layanan (admin) & permohonan layanan (warga+staff)

import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  serviceTypeRepository,
  serviceRequestRepository,
  type ServiceRequestRow,
} from '../repositories/serviceRepository';
import { ok, created, fail, notFound, forbidden, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { generateRequestNumber } from '../utils/auth';
import { parsePagination, formatZodErrors } from '../validators/common';

// -----------------------------------------------------
// Validasi - Tipe Layanan
// -----------------------------------------------------

const createServiceTypeSchema = z.object({
  code: z.string().min(2, 'Kode minimal 2 karakter').max(50).regex(/^[A-Z0-9_-]+$/i, 'Kode hanya boleh huruf, angka, underscore, dan tanda hubung'),
  name: z.string().min(3, 'Nama minimal 3 karakter').max(150),
  description: z.string().max(1000).optional().nullable(),
  requirements: z.string().min(1, 'Persyaratan wajib diisi').max(5000),
  processingDays: z.number().int().min(1).optional().nullable(),
  active: z.boolean().default(true),
});

const updateServiceTypeSchema = createServiceTypeSchema.partial();

// -----------------------------------------------------
// Validasi - Permohonan Layanan
// -----------------------------------------------------

const createServiceRequestSchema = z.object({
  serviceTypeId: z.number().int().positive('Tipe layanan wajib diisi'),
  purpose: z.string().min(3, 'Keperluan minimal 3 karakter').max(1000),
  notes: z.string().max(2000).optional().nullable(),
});

const updateRequestStatusSchema = z.object({
  status: z.enum(['diajukan', 'dalam_pemeriksaan', 'perlu_perbaikan', 'disetujui', 'ditolak', 'selesai']),
  note: z.string().max(2000).optional().nullable(),
  rejectionReason: z.string().max(2000).optional().nullable(),
});

// Daftar status yang valid untuk transisi (mencegah transisi balik yang tidak masuk akal)
const VALID_TRANSITIONS: Record<string, string[]> = {
  diajukan: ['dalam_pemeriksaan', 'perlu_perbaikan', 'disetujui', 'ditolak'],
  dalam_pemeriksaan: ['perlu_perbaikan', 'disetujui', 'ditolak'],
  perlu_perbaikan: ['dalam_pemeriksaan', 'ditolak'],
  disetujui: ['selesai'],
  ditolak: [],
  selesai: [],
};

// Helper: cek apakah user adalah staff
function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

// Helper: cek kepemilikan request oleh warga
function checkOwnership(req: Request, row: ServiceRequestRow | null): boolean {
  if (!row || !req.user) return false;
  if (isStaff(req.user.role)) return true;
  return row.user_id === req.user.sub;
}

export const serviceController = {
  // =============== Service Types ===============

  // List tipe layanan aktif (publik)
  listTypes: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await serviceTypeRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      activeOnly: true,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // List semua tipe layanan (staff)
  listTypesAdmin: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await serviceTypeRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      activeOnly: false,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu tipe layanan by id (publik)
  getType: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const item = await serviceTypeRepository.findById(id);
    if (!item || item.active !== 1) return notFound(res, 'Tipe layanan tidak ditemukan');
    return ok(res, item, 'OK');
  }),

  // Buat tipe layanan baru (admin)
  createType: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createServiceTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;
    // Cek duplikasi kode
    const existing = await serviceTypeRepository.findByCode(data.code);
    if (existing) return fail(res, 'Kode tipe layanan sudah digunakan', 409);
    const id = await serviceTypeRepository.create({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      requirements: data.requirements,
      processingDays: data.processingDays ?? null,
      active: data.active,
    });
    const createdRow = await serviceTypeRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_SERVICE_TYPE',
      entity: 'service_types',
      entityId: id,
      description: `Membuat tipe layanan: ${data.name} (${data.code})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Tipe layanan berhasil dibuat');
  }),

  // Perbarui tipe layanan (admin)
  updateType: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await serviceTypeRepository.findById(id);
    if (!existing) return notFound(res, 'Tipe layanan tidak ditemukan');

    const parsed = updateServiceTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Cek duplikasi kode jika berubah
    if (data.code !== undefined && data.code !== existing.code) {
      const byCode = await serviceTypeRepository.findByCode(data.code);
      if (byCode && byCode.id !== id) return fail(res, 'Kode tipe layanan sudah digunakan', 409);
    }

    await serviceTypeRepository.update(id, {
      code: data.code,
      name: data.name,
      description: data.description,
      requirements: data.requirements,
      processingDays: data.processingDays,
      active: data.active,
    });

    const updated = await serviceTypeRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_SERVICE_TYPE',
      entity: 'service_types',
      entityId: id,
      description: `Memperbarui tipe layanan: ${updated?.name ?? existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Tipe layanan berhasil diperbarui');
  }),

  // Hapus tipe layanan (admin) - cek tidak ada request aktif yang mereferensi
  deleteType: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await serviceTypeRepository.findById(id);
    if (!existing) return notFound(res, 'Tipe layanan tidak ditemukan');

    // Cek apakah masih ada request aktif yang mereferensikan tipe ini
    // Status aktif: selain 'ditolak' dan 'selesai'
    // Ambil 100 request terbaru untuk memastikan tidak ada yang aktif terlewat
    const { rows } = await serviceRequestRepository.list({
      page: 1,
      limit: 100,
      serviceTypeId: id,
    });
    const activeRequests = rows.filter(
      (r) => r.status !== 'ditolak' && r.status !== 'selesai'
    );
    if (activeRequests.length > 0) {
      return fail(res, 'Tipe layanan tidak dapat dihapus karena masih ada permohonan aktif yang mereferensikannya', 400);
    }

    await serviceTypeRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_SERVICE_TYPE',
      entity: 'service_types',
      entityId: id,
      description: `Menghapus tipe layanan: ${existing.name} (${existing.code})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Tipe layanan berhasil dihapus');
  }),

  // =============== Service Requests ===============

  // List permohonan layanan (warga: milik sendiri, staff: semua)
  listRequests: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const staff = isStaff(req.user?.role);
    const { rows, total } = await serviceRequestRepository.list({
      page,
      limit,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      serviceTypeId: req.query.serviceTypeId ? parseInt(req.query.serviceTypeId as string, 10) : undefined,
      userId: staff ? undefined : req.user!.sub,
    });
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil satu permohonan by id (dengan attachment dan events)
  getRequest: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const item = await serviceRequestRepository.findById(id);
    if (!item) return notFound(res, 'Permohonan tidak ditemukan');
    if (!checkOwnership(req, item)) return forbidden(res, 'Anda tidak dapat mengakses permohonan ini');
    const [attachments, events] = await Promise.all([
      serviceRequestRepository.listAttachments(id),
      serviceRequestRepository.listEvents(id),
    ]);
    return ok(res, { ...item, attachments, events }, 'OK');
  }),

  // Buat permohonan baru (warga)
  createRequest: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createServiceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Pastikan tipe layanan ada dan aktif
    const type = await serviceTypeRepository.findById(data.serviceTypeId);
    if (!type || type.active !== 1) {
      return fail(res, 'Tipe layanan tidak tersedia', 422);
    }

    // Generate nomor permohonan unik
    let requestNumber = generateRequestNumber();
    let exists = await serviceRequestRepository.findByRequestNumber(requestNumber);
    let attempts = 0;
    while (exists && attempts < 5) {
      requestNumber = generateRequestNumber();
      // eslint-disable-next-line no-await-in-loop
      exists = await serviceRequestRepository.findByRequestNumber(requestNumber);
      attempts += 1;
    }

    const id = await serviceRequestRepository.create({
      requestNumber,
      serviceTypeId: data.serviceTypeId,
      userId: req.user!.sub,
      purpose: data.purpose,
      notes: data.notes ?? null,
    });

    // Tambahkan event awal
    await serviceRequestRepository.addEvent({
      requestId: id,
      fromStatus: null,
      toStatus: 'diajukan',
      note: 'Permohonan diajukan oleh pemohon',
      createdById: req.user!.sub,
    });

    const createdRow = await serviceRequestRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_SERVICE_REQUEST',
      entity: 'service_requests',
      entityId: id,
      description: `Membuat permohonan layanan ${requestNumber} (${type.name})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Permohonan layanan berhasil dibuat');
  }),

  // Update status permohonan (staff)
  updateRequestStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await serviceRequestRepository.findById(id);
    if (!existing) return notFound(res, 'Permohonan tidak ditemukan');

    const parsed = updateRequestStatusSchema.safeParse(req.body);
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

    // Jika status ditolak, rejectionReason wajib
    if (data.status === 'ditolak' && !data.rejectionReason) {
      return fail(res, 'Alasan penolakan wajib diisi saat menolak permohonan', 422);
    }

    await serviceRequestRepository.updateStatus(
      id,
      data.status,
      req.user!.sub,
      data.status === 'ditolak' ? (data.rejectionReason ?? null) : undefined
    );

    await serviceRequestRepository.addEvent({
      requestId: id,
      fromStatus: existing.status,
      toStatus: data.status,
      note: data.note ?? (data.status === 'ditolak' ? data.rejectionReason ?? null : null),
      createdById: req.user!.sub,
    });

    const updated = await serviceRequestRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_SERVICE_REQUEST_STATUS',
      entity: 'service_requests',
      entityId: id,
      description: `Memperbarui status permohonan ${existing.request_number}: ${existing.status} -> ${data.status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Status permohonan berhasil diperbarui');
  }),

  // Tambah lampiran ke permohonan (warga pemilik atau staff)
  addAttachment: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await serviceRequestRepository.findById(id);
    if (!existing) return notFound(res, 'Permohonan tidak ditemukan');
    if (!checkOwnership(req, existing)) {
      return forbidden(res, 'Anda tidak dapat menambah lampiran ke permohonan ini');
    }

    const file = req.file;
    if (!file) return fail(res, 'Berkas wajib diisi', 422);

    // Status permohonan sudah selesai/ditolak tidak boleh ditambah lampiran
    if (existing.status === 'selesai' || existing.status === 'ditolak') {
      return fail(res, 'Permohonan sudah selesai/ditolak, tidak dapat menambah lampiran', 400);
    }

    const attachmentId = await serviceRequestRepository.addAttachment({
      requestId: id,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    await logActivity({
      userId: req.user!.sub,
      action: 'ADD_SERVICE_REQUEST_ATTACHMENT',
      entity: 'service_request_attachments',
      entityId: attachmentId,
      description: `Menambah lampiran ${file.originalname} ke permohonan ${existing.request_number}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const attachments = await serviceRequestRepository.listAttachments(id);
    return created(res, { attachmentId, attachments }, 'Lampiran berhasil ditambahkan');
  }),
};
