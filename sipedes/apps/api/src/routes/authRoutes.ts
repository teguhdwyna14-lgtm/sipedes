// Auth routes

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { config } from '../config/env';

export const authRouter = Router();

// Rate limit khusus login untuk mencegah brute force
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});

authRouter.post('/register', authController.register);
// Login email (untuk staff/admin)
authRouter.post('/login', loginLimiter, authController.login);
// Login NIK (untuk warga)
authRouter.post('/login-nik', loginLimiter, authController.loginNik);
// Ganti password wajib pada login pertama
authRouter.post('/force-change-password', authenticate, authController.forceChangePassword);
authRouter.get('/me', authenticate, authController.me);
authRouter.patch('/me', authenticate, authController.updateProfile);
authRouter.post('/change-password', authenticate, authController.changePassword);
