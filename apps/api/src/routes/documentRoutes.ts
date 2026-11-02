// Document routes - arsip dokumen

import { Router } from 'express';
import { documentController } from '../controllers/documentController';
import { requireStaff, requireRole } from '../middleware/auth';
// upload middleware dari middleware/upload.ts (multer instance)
import { upload } from '../middleware/upload';

export const documentRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /documents

// List dokumen (warga: publik + milik sendiri, staff: semua)
documentRouter.get('/', documentController.list);

// Ambil metadata satu dokumen by id
documentRouter.get('/:id', documentController.get);

// Download berkas dokumen
documentRouter.get('/:id/download', documentController.download);

// Buat dokumen baru (staff) - upload berkas, multer menangani field 'file'
documentRouter.post('/', requireStaff, upload.single('file'), documentController.create);

// Perbarui metadata dokumen (staff)
documentRouter.put('/:id', requireStaff, documentController.update);

// Hapus dokumen (admin)
documentRouter.delete('/:id', requireRole('admin'), documentController.remove);
