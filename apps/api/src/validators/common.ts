// =====================================================
// Validation Helpers (Zod)
// =====================================================

import { z } from 'zod';

export const emailSchema = z.string().email('Format email tidak valid').max(191);
export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(72, 'Kata sandi maksimal 72 karakter')
  .regex(/[A-Za-z]/, 'Harus mengandung huruf')
  .regex(/[0-9]/, 'Harus mengandung angka');

export const fullNameSchema = z
  .string()
  .min(3, 'Nama lengkap minimal 3 karakter')
  .max(150, 'Nama lengkap maksimal 150 karakter');

export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]{7,30}$/, 'Format nomor telepon tidak valid')
  .optional()
  .or(z.literal(''));

export const nikSchema = z
  .string()
  .regex(/^[0-9]{16}$/, 'NIK harus 16 digit angka')
  .optional()
  .or(z.literal(''));

export const kkSchema = z
  .string()
  .regex(/^[0-9]{16}$/, 'Nomor KK harus 16 digit angka')
  .optional()
  .or(z.literal(''));

export const rtRwSchema = z
  .string()
  .regex(/^[0-9]{1,3}$/, 'Format RT/RW tidak valid')
  .optional()
  .or(z.literal(''));

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')
  .max(255)
  .optional()
  .or(z.literal(''));

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export function parsePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = pageSchema.parse(query.page ?? 1);
  const limit = limitSchema.parse(query.limit ?? 10);
  return { page, limit, offset: (page - 1) * limit };
}

export function formatZodErrors(err: z.ZodError): Array<{ field?: string; message: string }> {
  return err.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}
