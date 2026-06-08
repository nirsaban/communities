import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

export const config = {
  port: Number(process.env.DASHBOARD_PORT ?? 4000),
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4242',
  apiBase: '/api/v1',
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/community',
  repoRoot,
  backendSrc: path.join(repoRoot, 'backend', 'src'),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
};

export type Config = typeof config;
