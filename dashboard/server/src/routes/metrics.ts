import { Router } from 'express';
import { makeBackendClient } from '../lib/backend.js';

const router = Router();

// Pass-through to the opt-in backend metrics endpoint. If the backend hasn't
// mounted it (DASHBOARD_METRICS=1 not set), we return `{ enabled: false }`
// so the UI can show a hint instead of failing.
router.get('/metrics', async (_req, res) => {
  const client = makeBackendClient();
  const r = await client.get('/__dashboard/metrics');
  if (r.status === 404) {
    res.json({ data: { enabled: false, hint: 'Set DASHBOARD_METRICS=1 in backend/.env and restart.' } });
    return;
  }
  if (r.status >= 400) {
    res.status(502).json({ error: { code: 'BACKEND_METRICS_ERROR', message: `status=${r.status}` } });
    return;
  }
  res.json({ data: { enabled: true, ...(r.data?.data ?? r.data) } });
});

export default router;
