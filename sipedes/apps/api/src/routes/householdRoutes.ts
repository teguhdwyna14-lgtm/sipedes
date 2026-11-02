// Household routes - manajemen Kartu Keluarga & anggota
// Route /mine didaftarkan SEBELUM /:id agar tidak tertangkap sebagai param

import { Router } from 'express';
import { householdController } from '../controllers/householdController';
import { requireStaff, requireRole } from '../middleware/auth';

export const householdRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /households

// Ambil KK milik warga yang login (auth - warga)
// WAJIB didaftarkan SEBELUM route /:id
householdRouter.get('/mine', householdController.getMyHousehold);

// List semua KK (staff)
householdRouter.get('/', requireStaff, householdController.list);

// Ambil satu KK by id (staff)
householdRouter.get('/:id', requireStaff, householdController.get);

// Buat KK baru (admin)
householdRouter.post('/', requireRole('admin'), householdController.create);

// Perbarui KK (admin)
householdRouter.put('/:id', requireRole('admin'), householdController.update);

// Hapus KK (admin)
householdRouter.delete('/:id', requireRole('admin'), householdController.remove);

// Tambah anggota KK (admin)
householdRouter.post('/:id/members', requireRole('admin'), householdController.addMember);

// Perbarui role anggota (admin)
householdRouter.put('/:id/members/:mid', requireRole('admin'), householdController.updateMember);

// Hapus anggota dari KK (admin)
householdRouter.delete('/:id/members/:mid', requireRole('admin'), householdController.removeMember);

// Set kepala keluarga (admin)
householdRouter.patch('/:id/head', requireRole('admin'), householdController.setHead);
