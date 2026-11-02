// =====================================================
// API Response Helpers
// Format respons konsisten: { success, message, data?, errors?, meta? }
// =====================================================

import type { Response } from 'express';
import type { ApiResponse } from '@sipedes/shared';

export function ok<T>(res: Response, data: T, message = 'OK', status = 200): Response {
  const body: ApiResponse<T> = { success: true, message, data };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function paginated<T>(
  res: Response,
  items: T[],
  page: number,
  limit: number,
  total: number,
  message = 'OK'
): Response {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const body: ApiResponse<{ items: T[] }> = {
    success: true,
    message,
    data: { items },
    meta: { page, limit, total, totalPages },
  };
  return res.status(200).json(body);
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors?: Array<{ field?: string; message: string }>
): Response {
  const body: ApiResponse = { success: false, message, errors };
  return res.status(status).json(body);
}

export function notFound(res: Response, message = 'Data tidak ditemukan'): Response {
  return fail(res, message, 404);
}

export function unauthorized(res: Response, message = 'Tidak terautentikasi'): Response {
  return fail(res, message, 401);
}

export function forbidden(res: Response, message = 'Akses ditolak'): Response {
  return fail(res, message, 403);
}

export function conflict(res: Response, message = 'Data sudah ada'): Response {
  return fail(res, message, 409);
}
