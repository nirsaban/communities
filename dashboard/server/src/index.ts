import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import systemRouter from './routes/system.js';
import healthRouter from './routes/health.js';
import metricsRouter from './routes/metrics.js';
import dbRouter from './routes/db.js';
import e2eRouter from './routes/e2e.js';
import { startHealthPoller } from './routes/poller.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/ping', (_req, res) => {
  res.json({ data: { ok: true, t: Date.now() } });
});

app.use('/api', systemRouter);
app.use('/api', healthRouter);
app.use('/api', metricsRouter);
app.use('/api', dbRouter);
app.use('/api', e2eRouter);

// Centralized error envelope.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: { code: 'BFF_INTERNAL', message } });
});

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[dashboard-bff] listening on :${config.port} → backend ${config.backendUrl}`);
  startHealthPoller();
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
