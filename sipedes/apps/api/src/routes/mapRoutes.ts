// Map (Peta Desa) routes
// Publik untuk lihat lokasi & download file, staff/admin untuk CRUD

import { Router } from 'express';
import { mapController } from '../controllers/mapController';
import { authenticate, requireStaff, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

export const mapRouter = Router();

// -----------------------------------------------------
// Route map_locations
// -----------------------------------------------------

// List lokasi aktif (publik)
mapRouter.get('/locations', mapController.listLocations);

// Ambil satu lokasi by id (publik)
mapRouter.get('/locations/:id', mapController.getLocation);

// Buat lokasi baru (staff)
mapRouter.post('/locations', authenticate, requireStaff, mapController.createLocation);

// Perbarui lokasi (staff)
mapRouter.put('/locations/:id', authenticate, requireStaff, mapController.updateLocation);

// Hapus lokasi (admin)
mapRouter.delete('/locations/:id', authenticate, requireRole('admin'), mapController.deleteLocation);

// -----------------------------------------------------
// Route map_files
// -----------------------------------------------------

// List file peta (publik)
mapRouter.get('/files', mapController.listFiles);

// Download file peta by id (publik)
// PENTING: download harus didaftarkan SEBELUM route /:id agar tidak bentrok
// (di sini polanya /files/:id/download vs /files/:id, jadi tidak ada bentrok)
mapRouter.get('/files/:id/download', mapController.downloadFile);

// Upload file peta (admin) - multer single 'file'
mapRouter.post('/files', authenticate, requireRole('admin'), upload.single('file'), mapController.uploadFile);

// Hapus file peta (admin)
mapRouter.delete('/files/:id', authenticate, requireRole('admin'), mapController.deleteFile);
