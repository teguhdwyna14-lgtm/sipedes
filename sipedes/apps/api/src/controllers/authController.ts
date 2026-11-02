// Auth controller

import type { Request, Response } from 'express';
import {
  authService,
  registerSchema,
  loginSchema,
  nikLoginSchema,
  forceChangePasswordSchema,
  formatZodErrors,
} from '../services/authService';
import { ok, created, fail } from '../utils/response';
import { asyncHandler } from '../middleware/error';
import { logActivity } from '../utils/activityLogger';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    try {
      const { user, token } = await authService.register(parsed.data);
      await logActivity({
        userId: user.id,
        action: 'REGISTER',
        entity: 'users',
        entityId: user.id,
        description: `Pendaftaran akun warga baru: ${user.email}`,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return created(res, { user, token, expiresIn: '7d' }, 'Pendaftaran berhasil. Akun menunggu verifikasi petugas.');
    } catch (err) {
      const e = err as Error & { status?: number };
      return fail(res, e.message, e.status ?? 400);
    }
  }),

  /** Login menggunakan email + password (untuk staff/admin) */
  login: asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      await logActivity({
        userId: result.user.id,
        action: 'LOGIN',
        entity: 'users',
        entityId: result.user.id,
        description: `Login: ${result.user.email}`,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return ok(res, result, 'Login berhasil');
    } catch (err) {
      const e = err as Error & { status?: number };
      await logActivity({
        userId: null,
        action: 'LOGIN_FAILED',
        description: `Percobaan login email gagal: ${parsed.data.email}`,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return fail(res, e.message, e.status ?? 401);
    }
  }),

  /** Login menggunakan NIK + password (password awal = tanggal lahir DDMMYYYY) */
  loginNik: asyncHandler(async (req: Request, res: Response) => {
    const parsed = nikLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    try {
      const result = await authService.loginWithNik(parsed.data.nik, parsed.data.password);
      await logActivity({
        userId: result.user.id,
        action: 'LOGIN_NIK',
        entity: 'users',
        entityId: result.user.id,
        description: `Login via NIK`,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      const message = result.mustChangePassword
        ? 'Login berhasil. Mohon ganti kata sandi awal Anda.'
        : 'Login berhasil';
      return ok(res, result, message);
    } catch (err) {
      const e = err as Error & { status?: number };
      // Catat kegagalan tapi JANGAN catat NIK yang dicoba dalam log
      await logActivity({
        userId: null,
        action: 'LOGIN_NIK_FAILED',
        description: 'Percobaan login NIK gagal',
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      return fail(res, e.message, e.status ?? 401);
    }
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return fail(res, 'Tidak terautentikasi', 401);
    try {
      const result = await authService.getProfile(req.user.sub);
      return ok(res, result, 'Profil pengguna');
    } catch (err) {
      const e = err as Error & { status?: number };
      return fail(res, e.message, e.status ?? 404);
    }
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return fail(res, 'Tidak terautentikasi', 401);
    try {
      const user = await authService.updateProfile(req.user.sub, req.body);
      await logActivity({
        userId: req.user.sub,
        action: 'UPDATE_PROFILE',
        entity: 'users',
        entityId: user.id,
        description: `Memperbarui profil: ${user.email}`,
        ipAddress: req.ip ?? null,
      });
      return ok(res, user, 'Profil diperbarui');
    } catch (err) {
      const e = err as Error & { status?: number };
      return fail(res, e.message, e.status ?? 400);
    }
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return fail(res, 'Tidak terautentikasi', 401);
    const { oldPassword, newPassword } = req.body ?? {};
    if (!oldPassword || !newPassword) return fail(res, 'oldPassword dan newPassword wajib diisi', 422);
    if (newPassword.length < 8) return fail(res, 'Kata sandi baru minimal 8 karakter', 422);
    try {
      await authService.changePassword(req.user.sub, oldPassword, newPassword);
      await logActivity({
        userId: req.user.sub,
        action: 'CHANGE_PASSWORD',
        description: 'Mengubah kata sandi',
        ipAddress: req.ip ?? null,
      });
      return ok(res, null, 'Kata sandi berhasil diubah');
    } catch (err) {
      const e = err as Error & { status?: number };
      return fail(res, e.message, e.status ?? 400);
    }
  }),

  /**
   * Ganti password wajib pada login pertama (password awal = tanggal lahir).
   * Setelah ini password_changed_at di-set, password awal tidak lagi berfungsi.
   */
  forceChangePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return fail(res, 'Tidak terautentikasi', 401);
    const parsed = forceChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Validasi gagal', 422, formatZodErrors(parsed.error));
    }
    try {
      await authService.forceChangePassword(req.user.sub, parsed.data.newPassword);
      await logActivity({
        userId: req.user.sub,
        action: 'FORCE_CHANGE_PASSWORD',
        description: 'Penggantian kata sandi awal (first login)',
        ipAddress: req.ip ?? null,
      });
      return ok(res, null, 'Kata sandi berhasil diubah. Silakan lanjutkan menggunakan aplikasi.');
    } catch (err) {
      const e = err as Error & { status?: number };
      return fail(res, e.message, e.status ?? 400);
    }
  }),
};
