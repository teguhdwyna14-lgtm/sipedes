// Dashboard routes - statistik ringkasan

import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

export const dashboardRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /dashboard

// Statistik dashboard berbasis peran
dashboardRouter.get('/stats', dashboardController.stats);
