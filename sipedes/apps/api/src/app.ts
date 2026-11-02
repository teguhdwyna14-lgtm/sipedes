// Express app utama

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { router as apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // ----- Security & infra middleware -----
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // ----- Rate limiting global -----
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  });
  app.use('/api', limiter);

  // ----- Static uploads (dengan proteksi - lihat route documents) -----
  const uploadDir = path.resolve(config.upload.dir);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  // JANGAN serve raw uploads folder untuk file privat - gunakan endpoint download yang memeriksa izin

  // ----- Health check -----
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: config.appName, env: config.env, time: new Date().toISOString() });
  });

  // ----- API v1 -----
  app.use('/api/v1', apiRouter);

  // ----- 404 & error handler -----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
