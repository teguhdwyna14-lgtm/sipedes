// Auth middleware - verifikasi JWT dan attach user ke req

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { unauthorized, forbidden } from '../utils/response';
import type { JwtUserPayload } from '../types/auth';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    unauthorized(res, 'Token autentikasi tidak ditemukan');
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    if (payload.status !== 'active') {
      forbidden(res, 'Akun belum diverifikasi atau dinonaktifkan');
      return;
    }
    req.user = payload as JwtUserPayload;
    next();
  } catch {
    unauthorized(res, 'Token tidak valid atau kedaluwarsa');
  }
}

export function requireRole(...roles: Array<'warga' | 'petugas' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      forbidden(res, 'Peran tidak memiliki akses ke sumber daya ini');
      return;
    }
    next();
  };
}

export const requireStaff = requireRole('petugas', 'admin');
