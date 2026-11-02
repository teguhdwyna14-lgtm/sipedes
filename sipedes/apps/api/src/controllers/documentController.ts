// Document controller - arsip dokumen

import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { documentRepository, type DocumentRow } from '../repositories/documentRepository';
import { ok, created, fail, notFound, forbidden, paginated } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';
import { parsePagination, formatZodErrors } from '../validators/common';

// Skema validasi pembuatan dokumen
const createDocumentSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(255),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  isPublic: z.boolean().default(false),
});

// Skema validasi pembaruan metadata dokumen
const updateDocumentSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  isPublic: z.boolean().optional(),
});

// Helper: cek apakah user adalah staff
function isStaff(role: string | undefined): boolean {
  return role === 'petugas' || role === 'admin';
}

// Helper: cek apakah user berhak mengakses dokumen
function canAccess(req: Request, doc: DocumentRow): boolean {
  if (!req.user) return false;
  if (isStaff(req.user.role)) return true;
  if (doc.is_public === 1) return true;
  return doc.owner_id === req.user.sub;
}

// Helper: resolve path absolut berkas dari path relatif terhadap storage dir
function resolveFilePath(filePath: string): string {
  // Jika path sudah absolut, gunakan langsung
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  // Jika relatif, resolve terhadap process.cwd()
  return path.resolve(process.cwd(), filePath);
}

export const documentController = {
  // List dokumen (warga: publik + milik sendiri, staff: semua)
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const staff = isStaff(req.user?.role);
    if (staff) {
      const { rows, total } = await documentRepository.list({
        page,
        limit,
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined,
      });
      return paginated(res, rows, page, limit, total, 'OK');
    }
    // Warga: dokumen publik + milik sendiri (dua query digabung manual sederhana)
    const [publicResult, ownResult] = await Promise.all([
      documentRepository.list({
        page: 1,
        limit: 1000,
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined,
        onlyPublic: true,
      }),
      documentRepository.list({
        page: 1,
        limit: 1000,
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined,
        ownerId: req.user!.sub,
      }),
    ]);
    // Gabung, hapus duplikat berdasarkan id (dokumen milik sendiri yang juga publik)
    const seen = new Set<number>();
    const merged: DocumentRow[] = [];
    for (const row of [...publicResult.rows, ...ownResult.rows]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        merged.push(row);
      }
    }
    // Sortir berdasarkan created_at desc
    merged.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    const total = merged.length;
    const offset = (page - 1) * limit;
    const rows = merged.slice(offset, offset + limit);
    return paginated(res, rows, page, limit, total, 'OK');
  }),

  // Ambil metadata satu dokumen by id
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const doc = await documentRepository.findById(id);
    if (!doc) return notFound(res, 'Dokumen tidak ditemukan');
    if (!canAccess(req, doc)) return forbidden(res, 'Anda tidak dapat mengakses dokumen ini');
    return ok(res, doc, 'OK');
  }),

  // Download berkas dokumen (stream)
  download: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const doc = await documentRepository.findById(id);
    if (!doc) return notFound(res, 'Dokumen tidak ditemukan');
    if (!canAccess(req, doc)) return forbidden(res, 'Anda tidak dapat mengakses dokumen ini');

    const absolutePath = resolveFilePath(doc.file_path);
    if (!fs.existsSync(absolutePath)) {
      return notFound(res, 'Berkas fisik tidak ditemukan di server');
    }
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    res.setHeader('Content-Length', doc.file_size.toString());
    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (err) => {
      console.error('[document_download] stream error:', err);
      if (!res.headersSent) {
        fail(res, 'Gagal membaca berkas', 500);
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }),

  // Buat dokumen baru (staff) - dengan upload berkas
  create: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return fail(res, 'Berkas wajib diunggah', 422);

    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      // Hapus berkas yang sudah terupload karena validasi gagal
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    // Simpan path relatif terhadap cwd supaya portable
    const relPath = path.relative(process.cwd(), file.path);

    const id = await documentRepository.create({
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      fileName: file.originalname,
      filePath: relPath,
      mimeType: file.mimetype,
      fileSize: file.size,
      ownerId: null,
      requestId: null,
      isPublic: data.isPublic,
      uploadedById: req.user!.sub,
    });

    const createdRow = await documentRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'CREATE_DOCUMENT',
      entity: 'documents',
      entityId: id,
      description: `Mengunggah dokumen: ${data.title} (${file.originalname})`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return created(res, createdRow, 'Dokumen berhasil diunggah');
  }),

  // Perbarui metadata dokumen (staff)
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await documentRepository.findById(id);
    if (!existing) return notFound(res, 'Dokumen tidak ditemukan');

    const parsed = updateDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    const data = parsed.data;

    await documentRepository.update(id, {
      title: data.title,
      description: data.description,
      category: data.category,
      isPublic: data.isPublic,
    });

    const updated = await documentRepository.findById(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'UPDATE_DOCUMENT',
      entity: 'documents',
      entityId: id,
      description: `Memperbarui metadata dokumen: ${updated?.title ?? existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, updated, 'Dokumen berhasil diperbarui');
  }),

  // Hapus dokumen (admin) - hapus record + berkas fisik
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'ID tidak valid', 422);
    const existing = await documentRepository.findById(id);
    if (!existing) return notFound(res, 'Dokumen tidak ditemukan');

    // Hapus berkas fisik jika ada
    const absolutePath = resolveFilePath(existing.file_path);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      // Gagal hapus berkas tidak boleh memblokir penghapusan record
      console.error('[document_delete] gagal menghapus berkas:', err);
    }

    await documentRepository.delete(id);
    await logActivity({
      userId: req.user!.sub,
      action: 'DELETE_DOCUMENT',
      entity: 'documents',
      entityId: id,
      description: `Menghapus dokumen: ${existing.title}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return ok(res, null, 'Dokumen berhasil dihapus');
  }),
};
