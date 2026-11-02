// Service routes - tipe layanan & permohonan layanan

import { Router } from 'express';
import { serviceController } from '../controllers/serviceController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';
// upload middleware dari middleware/upload.ts (multer instance)
// Berkas field tunggal dengan nama 'file'
import { upload } from '../middleware/upload';

export const serviceRouter = Router();

// -----------------------------------------------------
// Route tipe layanan
// -----------------------------------------------------

// Publik: list tipe aktif
serviceRouter.get('/types', serviceController.listTypes);

// Staff: list semua tipe
serviceRouter.get('/types/admin', authenticate, requireStaff, serviceController.listTypesAdmin);

// Publik: ambil satu tipe by id
serviceRouter.get('/types/:id', serviceController.getType);

// Admin: buat tipe baru
serviceRouter.post('/types', authenticate, requireRole('admin'), serviceController.createType);

// Admin: perbarui tipe
serviceRouter.put('/types/:id', authenticate, requireRole('admin'), serviceController.updateType);

// Admin: hapus tipe
serviceRouter.delete('/types/:id', authenticate, requireRole('admin'), serviceController.deleteType);

// -----------------------------------------------------
// Route permohonan layanan (semua butuh auth)
// -----------------------------------------------------

// List permohonan (warga: milik sendiri, staff: semua)
serviceRouter.get('/requests', authenticate, serviceController.listRequests);

// Ambil satu permohonan by id (dengan cek kepemilikan)
serviceRouter.get('/requests/:id', authenticate, serviceController.getRequest);

// Buat permohonan baru (auth - warga/petugas/admin)
serviceRouter.post('/requests', authenticate, serviceController.createRequest);

// Update status permohonan (staff)
serviceRouter.patch('/requests/:id/status', authenticate, requireStaff, serviceController.updateRequestStatus);

// Tambah lampiran ke permohonan (auth - warga pemilik atau staff)
// multer menangani field tunggal 'file'
serviceRouter.post(
  '/requests/:id/attachments',
  authenticate,
  upload.single('file'),
  serviceController.addAttachment
);
