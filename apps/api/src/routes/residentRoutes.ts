// Resident routes - manajemen profil warga oleh staff

import { Router } from 'express';
import { residentController } from '../controllers/residentController';
import { requireStaff } from '../middleware/auth';

export const residentRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /residents

// List semua resident (staff) - dengan masking data sensitif
residentRouter.get('/', requireStaff, residentController.list);

// Ambil satu resident by id (staff) - data lengkap
residentRouter.get('/:id', requireStaff, residentController.get);

// Verifikasi / tolak resident (staff)
residentRouter.patch('/:id/verify', requireStaff, residentController.verify);

// Update data resident (staff)
residentRouter.put('/:id', requireStaff, residentController.update);
