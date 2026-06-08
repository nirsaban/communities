import type { Response } from 'express';
import { makeBackendClient, describeAxiosError } from '../lib/backend.js';
import { sseInit, sseSend, sseClose } from '../lib/sse.js';
import type { Ctx, Scenario, StepResult } from './types.js';

export async function streamScenario(scenario: Scenario, res: Response): Promise<void> {
  sseInit(res);
  const ctx: Ctx = {
    client: makeBackendClient(),
    vars: {},
    log: (level, msg, extra) => sseSend(res, 'log', { level, msg, extra }),
  };

  sseSend(res, 'start', {
    id: scenario.id,
    title: scenario.title,
    steps: scenario.steps.map((s) => s.name),
  });

  let passed = 0;
  let failed = 0;
  let totalMs = 0;
  const startedAt = Date.now();

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    sseSend(res, 'step:start', { i, name: step.name });
    let outcome: StepResult;
    try {
      outcome = await step.run(ctx);
    } catch (err) {
      const e = describeAxiosError(err);
      outcome = { ok: false, durationMs: 0, detail: e.message };
    }
    totalMs += outcome.durationMs;
    if (outcome.ok) passed++;
    else failed++;
    sseSend(res, 'step:end', { i, name: step.name, ...outcome });
    if (!outcome.ok) {
      // Stop on first failure — most scenarios chain state via ctx.vars.
      break;
    }
  }

  sseSend(res, 'summary', {
    id: scenario.id,
    passed,
    failed,
    total: scenario.steps.length,
    totalMs,
    wallMs: Date.now() - startedAt,
  });
  sseClose(res);
}
