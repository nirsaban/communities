import type { Scenario } from './types.js';
import { assertStatus, timed } from './types.js';

export const superScenario: Scenario = {
  id: 'super',
  title: 'Super admin guard',
  description: 'A regular user must NOT be able to hit /super/* routes — verifies the global role guard.',
  tags: ['auth', 'rbac'],
  steps: [
    {
      name: 'Register a new regular user',
      run: async ({ client, vars }) => {
        const email = `super-guard-${Date.now()}@dash.test`;
        const { result, durationMs } = await timed(() =>
          client.post('/auth/register', {
            email,
            password: 'TestPass!234',
            name: 'Guard Probe',
          }),
        );
        assertStatus(result, [200, 201]);
        vars.accessToken = result.data?.data?.tokens?.accessToken;
        return { ok: true, status: result.status, durationMs };
      },
    },
    {
      name: 'GET /super/communities without any token → 401',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() => client.get('/super/communities'));
        assertStatus(result, 401);
        return {
          ok: true,
          status: result.status,
          durationMs,
          detail: `error.code=${result.data?.error?.code}`,
        };
      },
    },
    {
      name: 'GET /super/communities with member token → 403',
      run: async ({ client, vars }) => {
        const { result, durationMs } = await timed(() =>
          client.get('/super/communities', {
            headers: { Authorization: `Bearer ${vars.accessToken}` },
          }),
        );
        assertStatus(result, 403);
        return {
          ok: true,
          status: result.status,
          durationMs,
          detail: `error.code=${result.data?.error?.code}`,
        };
      },
    },
  ],
};
