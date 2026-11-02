// API v1 router - menggabungkan semua route modules

import { Router } from 'express';
import { authRouter } from './authRoutes';
import { publicRouter } from './publicRoutes';
import { newsRouter } from './newsRoutes';
import { announcementRouter } from './announcementRoutes';
import { serviceRouter } from './serviceRoutes';
import { complaintRouter } from './complaintRoutes';
import { documentRouter } from './documentRoutes';
import { userRouter } from './userRoutes';
import { residentRouter } from './residentRoutes';
import { dashboardRouter } from './dashboardRoutes';
import { villageSettingsRouter } from './villageSettingsRoutes';
import { householdRouter } from './householdRoutes';
import { businessCategoryRouter } from './businessCategoryRoutes';
import { businessRouter } from './businessRoutes';
import { mapRouter } from './mapRoutes';
import { residentSearchRouter } from './residentSearchRoutes';
import { authenticate } from '../middleware/auth';

export const router = Router();

// Route publik (tanpa auth)
router.use('/public', publicRouter);
router.use('/auth', authRouter);

// Route campuran (publik + privat)
router.use('/news', newsRouter);
router.use('/announcements', announcementRouter);
router.use('/services', serviceRouter);
router.use('/village', villageSettingsRouter);

// Route publik modul baru (baca kategori usaha, daftar usaha approved, lihat peta)
router.use('/business-categories', businessCategoryRouter);
router.use('/businesses', businessRouter);
router.use('/map', mapRouter);

// Route privat (butuh auth)
router.use('/complaints', authenticate, complaintRouter);
router.use('/documents', authenticate, documentRouter);
router.use('/dashboard', authenticate, dashboardRouter);
router.use('/users', authenticate, userRouter);
router.use('/residents', authenticate, residentRouter);
router.use('/households', authenticate, householdRouter);
router.use('/residents-search', authenticate, residentSearchRouter);
