// User routes - manajemen pengguna oleh admin/staff

import { Router } from 'express';
import { userController } from '../controllers/userController';
import { requireStaff, requireRole } from '../middleware/auth';

export const userRouter = Router();

// Catatan: authenticate sudah diterapkan di routes/index.ts untuk /users

// List semua user (staff)
userRouter.get('/', requireStaff, userController.list);

// Ambil satu user by id (staff)
userRouter.get('/:id', requireStaff, userController.get);

// Update status user (admin)
userRouter.patch('/:id/status', requireRole('admin'), userController.updateStatus);

// Update role user (admin)
userRouter.patch('/:id/role', requireRole('admin'), userController.updateRole);

// Hapus user (admin)
userRouter.delete('/:id', requireRole('admin'), userController.remove);
