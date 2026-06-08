import { Router } from 'express';
import { makeBackendClient, describeAxiosError } from '../lib/backend.js';
import { getDb } from '../lib/mongo.js';
import { healthRing, type HealthSample } from '../lib/metricsStore.js';
import { config } from '../config.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const t0 = Date.now();
  const client = makeBackendClient();
  let ok = false;
  let db: 'ok' | 'down' | 'unknown' = 'unknown';
  let uptime: number | null = null;
  let version: string | null = null;
  let backendStatus = 0;
  let backendErr: string | undefined;
  try {
    const r = await client.get('/health');
    backendStatus = r.status;
    ok = r.status === 200 && r.data?.data?.status === 'ok';
    db = r.data?.data?.db ?? 'unknown';
    uptime = typeof r.data?.data?.uptime === 'number' ? r.data.data.uptime : null;
    version = r.data?.data?.version ?? null;
  } catch (err) {
    backendErr = describeAxiosError(err).message;
  }
  const latencyMs = Date.now() - t0;
  const sample: HealthSample = { t: Date.now(), ok, db, latencyMs, uptime };
  healthRing.push(sample);

  let mongoDirect: 'ok' | 'down' = 'down';
  let mongoPingMs = 0;
  try {
    const m0 = Date.now();
    const dbConn = await getDb();
    await dbConn.command({ ping: 1 });
    mongoPingMs = Date.now() - m0;
    mongoDirect = 'ok';
  } catch {
    mongoDirect = 'down';
  }

  res.json({
    data: {
      backend: {
        url: `${config.backendUrl}${config.apiBase}/health`,
        ok,
        status: backendStatus,
        latencyMs,
        uptime,
        version,
        dbReported: db,
        error: backendErr,
      },
      mongo: {
        uri: config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'),
        ok: mongoDirect === 'ok',
        pingMs: mongoPingMs,
      },
      latest: sample,
    },
  });
});

router.get('/health/history', (_req, res) => {
  res.json({ data: healthRing.list() });
});

export default router;
