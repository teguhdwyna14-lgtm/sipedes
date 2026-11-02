// Resident search routes
// Login-only - semua endpoint membutuhkan auth

import { Router } from 'express';
import { residentSearchController } from '../controllers/residentSearchController';

export const residentSearchRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /residents-search

// Pencarian warga by nama (auth)
residentSearchRouter.get('/search', residentSearchController.search);

// Ambil profil publik warga by id (auth)
// Hanya menampilkan data non-sensitif
residentSearchRouter.get('/:id', residentSearchController.getProfile);
