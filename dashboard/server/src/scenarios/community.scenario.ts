import type { Scenario } from './types.js';
import { assertStatus, timed } from './types.js';

// This scenario requires a superadmin to create a community, then verifies
// the resulting access path. If SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD env
// vars aren't set, the scenario short-circuits to "skipped".
export const communityScenario: Scenario = {
  id: 'community',
  title: 'Community creation (super admin)',
  description: 'Logs in as the seeded super admin and creates a throwaway community via /super/communities.',
  tags: ['rbac', 'requires-seed'],
  steps: [
    {
      name: 'Login as super admin (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD)',
      run: async ({ client, vars }) => {
        const email = process.env.SUPERADMIN_EMAIL;
        const password = process.env.SUPERADMIN_PASSWORD;
        if (!email || !password) {
          return {
            ok: true,
            durationMs: 0,
            detail: 'SKIPPED — set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD to run',
          };
        }
        const { result, durationMs } = await timed(() =>
          client.post('/auth/login', { email, password }),
        );
        assertStatus(result, 200);
        vars.adminToken = result.data?.data?.tokens?.accessToken;
        return { ok: true, status: result.status, durationMs };
      },
    },
    {
      name: 'POST /super/communities creates a community',
      run: async ({ client, vars }) => {
        if (!vars.adminToken) {
          return { ok: true, durationMs: 0, detail: 'SKIPPED — no admin token' };
        }
        const slug = `e2e-${Date.now()}`;
        const { result, durationMs } = await timed(() =>
          client.post(
            '/super/communities',
            {
              name: `E2E ${slug}`,
              slug,
              ownerEmail: `owner-${slug}@dash.test`,
            },
            { headers: { Authorization: `Bearer ${vars.adminToken}` } },
          ),
        );
        if (result.status >= 400) {
          // Surface body for debugging — common cause is schema mismatch on the create body.
          throw new Error(`status=${result.status} body=${JSON.stringify(result.data).slice(0, 200)}`);
        }
        vars.communityId = result.data?.data?._id ?? result.data?.data?.id;
        return {
          ok: true,
          status: result.status,
          durationMs,
          detail: `communityId=${vars.communityId}`,
        };
      },
    },
    {
      name: 'GET /super/communities lists the new one',
      run: async ({ client, vars }) => {
        if (!vars.adminToken || !vars.communityId) {
          return { ok: true, durationMs: 0, detail: 'SKIPPED' };
        }
        const { result, durationMs } = await timed(() =>
          client.get('/super/communities', {
            headers: { Authorization: `Bearer ${vars.adminToken}` },
          }),
        );
        assertStatus(result, 200);
        const items: Array<{ _id?: string; id?: string }> =
          result.data?.data ?? result.data?.data?.items ?? [];
        const present = Array.isArray(items)
          ? items.some((c) => (c._id ?? c.id) === vars.communityId)
          : false;
        return {
          ok: present,
          status: result.status,
          durationMs,
          detail: present ? 'present in list' : 'NOT present in list — check pagination',
        };
      },
    },
  ],
};
