// Complaint routes - pengaduan warga

import { Router } from 'express';
import { complaintController } from '../controllers/complaintController';
import { requireStaff } from '../middleware/auth';

export const complaintRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /complaints
// Route publik untuk tracking ada di publicRoutes.ts (/api/v1/public/complaints/track)

// List pengaduan (warga: milik sendiri, staff: semua)
complaintRouter.get('/', complaintController.list);

// Ambil satu pengaduan by id (cek kepemilikan)
complaintRouter.get('/:id', complaintController.get);

// Buat pengaduan baru (warga)
complaintRouter.post('/', complaintController.create);

// Tambah update status pengaduan (staff)
complaintRouter.post('/:id/updates', requireStaff, complaintController.addUpdate);
