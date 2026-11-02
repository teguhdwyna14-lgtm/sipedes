import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cari .env di beberapa lokasi: cwd, parent (monorepo root), dst.
function loadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
  dotenv.config();
}

loadEnv();

// Resolve root monorepo untuk path storage yang konsisten antar workspace
function findMonorepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) &&
        fs.existsSync(path.join(c, 'apps')) &&
        fs.existsSync(path.join(c, 'database'))) {
      return c;
    }
  }
  return process.cwd();
}

const MONOREPO_ROOT = findMonorepoRoot();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} tidak ditemukan. Periksa file .env`);
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function toInt(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  appName: optional('APP_NAME', 'SIPEDES'),
  port: toInt(optional('PORT', '4000'), 4000),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),

  db: {
    client: optional('DB_CLIENT', 'mysql') as 'mysql' | 'sqlite',
    host: optional('DB_HOST', '127.0.0.1'),
    port: toInt(optional('DB_PORT', '3306'), 3306),
    user: optional('DB_USER', 'root'),
    password: optional('DB_PASSWORD', ''),
    name: optional('DB_NAME', 'sipedes_db'),
    charset: optional('DB_CHARSET', 'utf8mb4'),
    storage: (() => {
      const s = optional('DB_STORAGE', './storage/sipedes.sqlite');
      return path.isAbsolute(s) ? s : path.resolve(MONOREPO_ROOT, s);
    })(),
  },

  jwt: {
    secret: required('JWT_SECRET', 'dev_secret_change_me_in_production_min_32_chars'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  bcrypt: {
    rounds: toInt(optional('BCRYPT_ROUNDS', '12'), 12),
  },

  rateLimit: {
    windowMs: toInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 900000),
    max: toInt(optional('RATE_LIMIT_MAX', '100'), 100),
    loginMax: toInt(optional('LOGIN_RATE_LIMIT_MAX', '5'), 5),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:5173').split(','),
  },

  upload: {
    dir: (() => {
      const d = optional('UPLOAD_DIR', './storage/uploads');
      return path.isAbsolute(d) ? d : path.resolve(MONOREPO_ROOT, d);
    })(),
    maxBytes: toInt(optional('MAX_UPLOAD_MB', '5'), 5) * 1024 * 1024,
    allowedMime: optional(
      'ALLOWED_MIME_TYPES',
      'image/jpeg,image/png,application/pdf'
    ).split(','),
  },
} as const;

export type AppConfig = typeof config;
