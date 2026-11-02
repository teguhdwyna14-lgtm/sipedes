// Error handler & async wrapper

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { fail } from '../utils/response';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, 'Endpoint tidak ditemukan', 404);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    fail(res, 'Validasi gagal', 422, errors);
    return;
  }
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'Kesalahan server internal';
  fail(res, message, 500);
}
