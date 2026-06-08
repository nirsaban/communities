import type { Scenario } from './types.js';
import { timed } from './types.js';

export const rateLimitScenario: Scenario = {
  id: 'rate-limit',
  title: 'Auth rate limiter',
  description: 'Hammer /auth/login with bad creds; expect 429 after the configured threshold (default 10/15min).',
  tags: ['security', 'slow'],
  steps: [
    {
      name: 'Burst /auth/login until 429 (or give up at 30)',
      run: async ({ client }) => {
        const start = Date.now();
        let last = 0;
        for (let i = 0; i < 30; i++) {
          const r = await client.post('/auth/login', {
            email: `nobody-${Date.now()}-${i}@dash.test`,
            password: 'wrong-pass-xxx',
          });
          last = r.status;
          if (r.status === 429) {
            return {
              ok: true,
              status: 429,
              durationMs: Date.now() - start,
              detail: `429 after ${i + 1} requests`,
            };
          }
        }
        return {
          ok: false,
          status: last,
          durationMs: Date.now() - start,
          detail: 'never saw 429 — limiter may be disabled or threshold > 30',
        };
      },
    },
  ],
};
