import { Router } from 'express';
import { ALL_SCENARIOS, getScenario } from '../scenarios/index.js';
import { streamScenario } from '../scenarios/runner.js';

const router = Router();

router.get('/e2e/scenarios', (_req, res) => {
  res.json({
    data: ALL_SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      tags: s.tags,
      stepCount: s.steps.length,
      steps: s.steps.map((st) => st.name),
    })),
  });
});

router.get('/e2e/run', async (req, res) => {
  const id = String(req.query.id ?? '');
  const scenario = getScenario(id);
  if (!scenario) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `no scenario "${id}"` } });
    return;
  }
  await streamScenario(scenario, res);
});

export default router;
