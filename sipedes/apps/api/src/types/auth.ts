// Auth-related types

export interface JwtUserPayload {
  sub: number; // user id
  email: string;
  role: 'warga' | 'petugas' | 'admin';
  status: 'pending' | 'active' | 'rejected' | 'disabled';
}

export interface AuthRequest extends Express.Request {
  user?: JwtUserPayload;
}

// Re-export Express namespace augmentation
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
