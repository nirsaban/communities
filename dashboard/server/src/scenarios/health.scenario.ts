import type { Scenario } from './types.js';
import { assertStatus, timed } from './types.js';

export const healthScenario: Scenario = {
  id: 'health',
  title: 'Health & envelope',
  description: 'Ping /health and assert the standard { data: { status, db, uptime, version } } envelope.',
  tags: ['smoke', 'infra'],
  steps: [
    {
      name: 'GET /health returns 200',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() => client.get('/health'));
        assertStatus(result, 200);
        return { ok: true, status: result.status, durationMs, body: result.data };
      },
    },
    {
      name: 'Envelope shape: data.status, data.db, data.uptime, data.version',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() => client.get('/health'));
        const d = result.data?.data;
        if (!d || typeof d.status !== 'string' || typeof d.db !== 'string' || typeof d.uptime !== 'number') {
          throw new Error(`envelope mismatch: ${JSON.stringify(result.data)}`);
        }
        return {
          ok: true,
          status: result.status,
          durationMs,
          detail: `status=${d.status} db=${d.db} uptime=${d.uptime}s version=${d.version}`,
        };
      },
    },
    {
      name: '404 on unknown route returns { error } envelope',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() => client.get('/this-route-does-not-exist'));
        assertStatus(result, 404);
        if (!result.data?.error?.code) {
          throw new Error(`expected error envelope, got ${JSON.stringify(result.data)}`);
        }
        return {
          ok: true,
          status: result.status,
          durationMs,
          detail: `error.code=${result.data.error.code}`,
        };
      },
    },
  ],
};
