// Business (Jasa & Usaha Warga) routes
// Publik untuk baca approved, auth untuk CRUD milik sendiri

import { Router } from 'express';
import { businessController } from '../controllers/businessController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';

export const businessRouter = Router();

// -----------------------------------------------------
// Route staff & owner - didaftarkan SEBELUM /:id
// agar /admin dan /mine tidak tertangkap oleh :id.
// -----------------------------------------------------

// List semua usaha (staff)
businessRouter.get('/admin', authenticate, requireStaff, businessController.listAdmin);

// List usaha milik user yang login (auth)
businessRouter.get('/mine', authenticate, businessController.listMine);

// Ambil satu usaha by id (staff, full data)
businessRouter.get('/admin/:id', authenticate, requireStaff, businessController.getAdmin);

// Buat usaha baru (auth - warga atau staff)
businessRouter.post('/', authenticate, businessController.create);

// Perbarui usaha (auth - owner atau staff)
businessRouter.put('/:id', authenticate, businessController.update);

// Update status usaha (staff)
businessRouter.patch('/:id/status', authenticate, requireStaff, businessController.updateStatus);

// Hapus usaha (auth - owner atau admin)
businessRouter.delete('/:id', authenticate, businessController.remove);

// -----------------------------------------------------
// Route publik (tanpa auth)
// -----------------------------------------------------

// List usaha approved (publik)
businessRouter.get('/', businessController.listPublic);

// Ambil satu usaha approved by id (publik)
// Harus didaftarkan TERAKHIR setelah semua route statis
businessRouter.get('/:id', businessController.getPublic);
