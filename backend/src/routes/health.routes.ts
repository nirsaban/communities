import { Router } from 'express';
import mongoose from 'mongoose';
import env from '../config/env';

const router = Router();

const startedAt = Date.now();

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    data: {
      status: 'ok',
      db: dbState === 1 ? 'ok' : 'down',
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      version: env.appVersion,
    },
  });
});

export default router;
