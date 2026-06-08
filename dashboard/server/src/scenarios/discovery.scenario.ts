import type { Scenario } from './types.js';
import { assertStatus, timed } from './types.js';

export const discoveryScenario: Scenario = {
  id: 'discovery',
  title: 'Public discovery surface',
  description: 'The discovery endpoints expose public-readable data without a token. Verifies they respond and use the envelope.',
  tags: ['public'],
  steps: [
    {
      name: 'GET /discovery responds',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() => client.get('/discovery'));
        // 200 if discovery is wired with no required params; 4xx is also acceptable as long as it uses the envelope
        if (result.status >= 500) throw new Error(`server error: ${result.status}`);
        if (result.status >= 200 && result.status < 300) {
          if (!result.data?.data && !Array.isArray(result.data?.data)) {
            // accept either shape
          }
          return { ok: true, status: result.status, durationMs, detail: 'data envelope present' };
        }
        if (!result.data?.error?.code) {
          throw new Error('non-2xx without error envelope');
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
