// Map (Peta Desa) controller
// Endpoint CRUD map_locations dan map_files, dengan streaming download

import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { mapRepository, type MapLocationRow, type MapFileRow } from '../repositories/mapRepository';
import { ok, created, fail, notFound, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { parsePagination, formatZodErrors } from '../validators/common';

// -----------------------------------------------------
// Skema validasi
// -----------------------------------------------------

const mapLocationTypeSchema = z.enum([
  'kanton_desa', 'fasilitas_umum', 'usaha_warga', 'batas_desa', 'lainnya',
]);

const createLocationSchema = z.object({
  name: z.string().min(3, 'Nama lokasi minimal 3 karakter').max(150, 'Nama lokasi maksimal 150 karakter'),
  type: mapLocationTypeSchema,
  description: z.string().max(2000).optional().nullable(),
  latitude: z.number().min(-90, 'Latitude tidak valid').max(90, 'Latitude tidak valid'),
  longitude: z.number().min(-180, 'Longitude tidak valid').max(180, 'Longitude tidak valid'),
  address: z.string().max(255).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  linkedBusinessId: z.number().int().positive().optional().nullable(),
  active: z.boolean().default(true),
});

const updateLocationSchema = createLocationSchema.partial();

const createFileMetadataSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(150),
  description: z.string().max(2000).optional().nullable(),
  attribution: z.string().max(255).optional().nullable(),
});

// -----------------------------------------------------
// Helper
// -----------------------------------------------------

function formatLocation(row: MapLocationRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    icon: row.icon,
    linkedBusinessId: row.linked_business_id,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatFile(row: MapFileRow): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    attribution: row.attribution,
    uploadedById: row.uploaded_by_id,
    createdAt: row.created_at,
  };
}

// Resolve path absolut dari file_path (relatif terhadap cwd)
function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  return path.resolve(process.cwd(), filePath);
}

export const mapController = {
  // ---------------------------------------------------
  // map_locations
  // ---------------------------------------------------

  // List lokasi aktif (publik) - optional filter by type
  listLocations: asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    // Untuk endpoint publik, gunakan listActiveLocations (lebih ringan)
    if (type) {
      // Validasi type
      const validTypes = ['kanton_desa', 'fasilitas_umum', 'usaha_warga', 'batas_desa', 'lainnya'];
      if (!validTypes.includes(type)) {
        return fail(res, 'Tipe lokasi tidak valid', 422);
      }
    }
    const rows = await mapRepository.listActiveLocations(type);
    return ok(res, rows.map(formatLocation), 'OK');
  }),

  // Ambil satu lokasi by id (publik)
  getLocation: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const location = await mapRepository.findLocationById(id);
    if (!location || location.active !== 1) {
      return notFound(res, 'Lokasi tidak ditemukan');
    }
    return ok(res, formatLocation(location), 'OK');
  }),

  // Buat lokasi baru (staff)
  createLocation: asyncHandler(async (req: Request, res: Response) => {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;
    const id = await mapRepository.createLocation({
      name: data.name,
      type: data.type,
      description: data.description === '' ? null : data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address === '' ? null : data.address,
      icon: data.icon === '' ? null : data.icon,
      linkedBusinessId: data.linkedBusinessId ?? null,
      active: data.active,
    });
    const createdRow = await mapRepository.findLocationById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_MAP_LOCATION',
      entity: 'map_locations',
      entityId: id,
      description: `Membuat lokasi peta: ${data.name} (${data.type})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow ? formatLocation(createdRow) : null, 'Lokasi berhasil dibuat');
  }),

  // Perbarui lokasi (staff)
  updateLocation: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await mapRepository.findLocationById(id);
    if (!existing) return notFound(res, 'Lokasi tidak ditemukan');

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    await mapRepository.updateLocation(id, {
      name: data.name,
      type: data.type,
      description: data.description === '' ? null : data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address === '' ? null : data.address,
      icon: data.icon === '' ? null : data.icon,
      linkedBusinessId: data.linkedBusinessId,
      active: data.active,
    });

    const updated = await mapRepository.findLocationById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_MAP_LOCATION',
      entity: 'map_locations',
      entityId: id,
      description: `Memperbarui lokasi peta: ${updated?.name ?? existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated ? formatLocation(updated) : null, 'Lokasi berhasil diperbarui');
  }),

  // Hapus lokasi (admin)
  deleteLocation: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await mapRepository.findLocationById(id);
    if (!existing) return notFound(res, 'Lokasi tidak ditemukan');
    await mapRepository.deleteLocation(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_MAP_LOCATION',
      entity: 'map_locations',
      entityId: id,
      description: `Menghapus lokasi peta: ${existing.name}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Lokasi berhasil dihapus');
  }),

  // ---------------------------------------------------
  // map_files
  // ---------------------------------------------------

  // List file peta untuk diunduh (publik)
  listFiles: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { rows, total } = await mapRepository.listFiles({ page, limit });
    return paginated(res, rows.map(formatFile), page, limit, total, 'OK');
  }),

  // Download file peta by id (publik - stream file)
  downloadFile: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const file = await mapRepository.findFileById(id);
    if (!file) return notFound(res, 'File peta tidak ditemukan');

    const absolutePath = resolveFilePath(file.file_path);
    if (!fs.existsSync(absolutePath)) {
      return notFound(res, 'Berkas fisik tidak ditemukan di server');
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    res.setHeader('Content-Length', file.file_size.toString());
    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (err) => {
      console.error('[map_file_download] stream error:', err);
      if (!res.headersSent) {
        fail(res, 'Gagal membaca berkas', 500);
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }),

  // Upload file peta (admin) - multer single 'file'
  uploadFile: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return fail(res, 'Berkas wajib diunggah', 422);

    const parsed = createFileMetadataSchema.safeParse(req.body);
    if (!parsed.success) {
      // Hapus berkas yang sudah terupload karena validasi gagal
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Simpan path relatif terhadap cwd supaya portable
    const relPath = path.relative(process.cwd(), file.path);

    const id = await mapRepository.createFile({
      title: data.title,
      description: data.description === '' ? null : data.description,
      fileName: file.originalname,
      filePath: relPath,
      mimeType: file.mimetype,
      fileSize: file.size,
      attribution: data.attribution === '' ? null : data.attribution,
      uploadedById: req.user!.sub,
    });

    const createdRow = await mapRepository.findFileById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPLOAD_MAP_FILE',
      entity: 'map_files',
      entityId: id,
      description: `Mengunggah file peta: ${data.title} (${file.originalname})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow ? formatFile(createdRow) : null, 'File peta berhasil diunggah');
  }),

  // Hapus file peta (admin) - hapus record + berkas fisik
  deleteFile: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await mapRepository.findFileById(id);
    if (!existing) return notFound(res, 'File peta tidak ditemukan');

    // Hapus berkas fisik jika ada
    const absolutePath = resolveFilePath(existing.file_path);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      // Gagal hapus berkas tidak boleh memblokir penghapusan record
      console.error('[map_file_delete] gagal menghapus berkas:', err);
    }

    await mapRepository.deleteFile(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_MAP_FILE',
      entity: 'map_files',
      entityId: id,
      description: `Menghapus file peta: ${existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'File peta berhasil dihapus');
  }),
};
