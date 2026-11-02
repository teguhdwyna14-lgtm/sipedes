// Business category routes
// Publik untuk baca, admin untuk CRUD

import { Router } from 'express';
import { businessCategoryController } from '../controllers/businessCategoryController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';

export const businessCategoryRouter = Router();

// -----------------------------------------------------
// Route admin/staff - didaftarkan SEBELUM /:id
// agar /admin tidak tertangkap oleh :id.
// -----------------------------------------------------

// List semua kategori (staff)
businessCategoryRouter.get('/admin', authenticate, requireStaff, businessCategoryController.listAdmin);

// Buat kategori baru (admin)
businessCategoryRouter.post('/', authenticate, requireRole('admin'), businessCategoryController.create);

// Perbarui kategori (admin)
businessCategoryRouter.put('/:id', authenticate, requireRole('admin'), businessCategoryController.update);

// Hapus kategori (admin)
businessCategoryRouter.delete('/:id', authenticate, requireRole('admin'), businessCategoryController.remove);

// -----------------------------------------------------
// Route publik (tanpa auth)
// -----------------------------------------------------

// List kategori aktif (publik)
businessCategoryRouter.get('/', businessCategoryController.list);

// Ambil satu kategori by id atau slug (publik)
// Harus didaftarkan TERAKHIR setelah semua route statis
businessCategoryRouter.get('/:id', businessCategoryController.get);
