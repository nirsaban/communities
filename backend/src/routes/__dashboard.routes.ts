import { Router } from 'express';
import { metricsStore } from '../middleware/metrics';

// Read-only metrics endpoint for the local Mission Control dashboard. Mounted
// only when DASHBOARD_METRICS=1. Not part of the product API.
const router = Router();

router.get('/metrics', (_req, res) => {
  res.json({ data: metricsStore.snapshot() });
});

export default router;
