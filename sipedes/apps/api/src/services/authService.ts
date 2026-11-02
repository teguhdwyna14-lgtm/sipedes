// Auth service - registrasi, login (NIK + tanggal lahir), profil

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { userRepository, rowToUser, mustChangePassword } from '../repositories/userRepository';
import { residentRepository } from '../repositories/residentRepository';
import { hashPassword, comparePassword, signToken } from '../utils/auth';
import { emailSchema, passwordSchema, fullNameSchema, phoneSchema, nikSchema, kkSchema, rtRwSchema, formatZodErrors } from '../validators/common';
import { config } from '../config/env';
import type { AuthResponse, User } from '@sipedes/shared';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  nik: nikSchema.optional().or(z.literal('')),
  kkNumber: kkSchema.optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  rt: rtRwSchema.optional().or(z.literal('')),
  rw: rtRwSchema.optional().or(z.literal('')),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login menggunakan NIK + password (password awal = tanggal lahir DDMMYYYY)
export const nikLoginSchema = z.object({
  nik: z.string().regex(/^[0-9]{16}$/, 'NIK harus 16 digit angka'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type NikLoginInput = z.infer<typeof nikLoginSchema>;

// Email login tetap tersedia untuk staff/admin (backward compat)
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

// Schema ganti password wajib setelah login pertama
export const forceChangePasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak cocok',
  path: ['confirmPassword'],
});

/**
 * Format tanggal lahir (YYYY-MM-DD atau ISO) menjadi DDMMYYYY
 */
export function birthDateToPassword(birthDate: string | null | undefined): string {
  if (!birthDate) return '';
  // Handle format YYYY-MM-DD atau ISO dengan timezone
  const dateStr = birthDate.slice(0, 10);
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}${m}${y}`;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: User; token: string }> {
    // Cek duplikasi email
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw Object.assign(new Error('Email sudah terdaftar'), { status: 409 });
    }

    const passwordHash = await hashPassword(input.password);
    const userId = await userRepository.create({
      email: input.email,
      nik: input.nik || null,
      passwordHash,
      fullName: input.fullName,
      role: 'warga',
      status: 'pending', // menunggu verifikasi petugas/admin
      phone: input.phone || null,
    });

    // Buat profil warga
    await residentRepository.create({
      userId,
      fullName: input.fullName,
      nik: input.nik || null,
      kkNumber: input.kkNumber || null,
      birthDate: input.birthDate || null,
      address: input.address || null,
      rt: input.rt || null,
      rw: input.rw || null,
      phone: input.phone || null,
      status: 'pending',
    });

    const userRow = await userRepository.findPublicById(userId);
    if (!userRow) throw new Error('Gagal membuat pengguna');
    const user = rowToUser(userRow);
    const token = signToken({
      sub: userId,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    return { user, token };
  },

  /**
   * Login menggunakan NIK + password (password awal = tanggal lahir DDMMYYYY)
   * Pesan error generik untuk hindari pembocoran NIK terdaftar.
   */
  async loginWithNik(nik: string, password: string): Promise<AuthResponse> {
    const user = await userRepository.findByNik(nik);
    // Selalu return pesan generik yang sama untuk NIK tidak ditemukan / password salah
    const genericError = 'NIK atau kata sandi salah';
    if (!user) {
      throw Object.assign(new Error(genericError), { status: 401 });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw Object.assign(new Error(genericError), { status: 401 });
    }
    // Cek status akun - berikan pesan sesuai status
    if (user.status === 'pending') {
      throw Object.assign(new Error('Akun Anda belum diverifikasi oleh petugas. Mohon tunggu.'), { status: 403 });
    }
    if (user.status === 'rejected') {
      throw Object.assign(new Error('Pendaftaran Anda ditolak. Hubungi kantor desa.'), { status: 403 });
    }
    if (user.status === 'disabled') {
      throw Object.assign(new Error('Akun Anda dinonaktifkan. Hubungi administrator.'), { status: 403 });
    }

    await userRepository.updateLastLogin(user.id);
    const publicRow = await userRepository.findPublicById(user.id);
    if (!publicRow) throw new Error('Gagal memuat data pengguna');
    const publicUser = rowToUser(publicRow);
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    return {
      user: publicUser,
      token,
      expiresIn: config.jwt.expiresIn,
      mustChangePassword: mustChangePassword(publicRow),
    };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error('Email atau kata sandi salah'), { status: 401 });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw Object.assign(new Error('Email atau kata sandi salah'), { status: 401 });
    }
    if (user.status === 'pending') {
      throw Object.assign(new Error('Akun Anda belum diverifikasi oleh petugas. Mohon tunggu.'), { status: 403 });
    }
    if (user.status === 'rejected') {
      throw Object.assign(new Error('Pendaftaran Anda ditolak. Hubungi kantor desa.'), { status: 403 });
    }
    if (user.status === 'disabled') {
      throw Object.assign(new Error('Akun Anda dinonaktifkan. Hubungi administrator.'), { status: 403 });
    }

    await userRepository.updateLastLogin(user.id);
    const publicRow = await userRepository.findPublicById(user.id);
    if (!publicRow) throw new Error('Gagal memuat data pengguna');
    const publicUser = rowToUser(publicRow);
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    return {
      user: publicUser,
      token,
      expiresIn: config.jwt.expiresIn,
      mustChangePassword: mustChangePassword(publicRow),
    };
  },

  async getProfile(userId: number): Promise<{ user: User; resident: unknown; mustChangePassword: boolean }> {
    const userRow = await userRepository.findPublicById(userId);
    if (!userRow) throw Object.assign(new Error('Pengguna tidak ditemukan'), { status: 404 });
    const resident = await residentRepository.findByUserId(userId);
    return { user: rowToUser(userRow), resident, mustChangePassword: mustChangePassword(userRow) };
  },

  async updateProfile(userId: number, params: { fullName?: string; phone?: string | null; avatarUrl?: string | null }): Promise<User> {
    await userRepository.updateProfile(userId, params);
    const row = await userRepository.findPublicById(userId);
    if (!row) throw new Error('Pengguna tidak ditemukan');
    return rowToUser(row);
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw Object.assign(new Error('Pengguna tidak ditemukan'), { status: 404 });
    const valid = await comparePassword(oldPassword, user.password_hash);
    if (!valid) throw Object.assign(new Error('Kata sandi lama salah'), { status: 400 });
    const hash = await hashPassword(newPassword);
    await userRepository.updatePasswordHash(userId, hash, true);
  },

  /**
   * Ganti password wajib pada login pertama.
   * Tidak perlu oldPassword (user sudah login dengan password awal).
   * Setelah ini password_changed_at di-set, jadi password awal tidak lagi berfungsi.
   */
  async forceChangePassword(userId: number, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw Object.assign(new Error('Pengguna tidak ditemukan'), { status: 404 });
    // Hanya boleh dipanggil jika password_changed_at masih NULL
    if (user.password_changed_at !== null) {
      throw Object.assign(new Error('Kata sandi sudah pernah diubah. Gunakan fitur ganti password biasa.'), { status: 400 });
    }
    const hash = await hashPassword(newPassword);
    await userRepository.updatePasswordHash(userId, hash, true);
  },
};

export { formatZodErrors, bcrypt };
