import type { Scenario } from './types.js';
import { assertStatus, timed } from './types.js';

function uniqEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@dash.test`;
}

export const authScenario: Scenario = {
  id: 'auth',
  title: 'Auth flow (register → login → me → refresh)',
  description: 'Creates a fresh user, logs in, fetches /auth/me, then rotates the refresh token.',
  tags: ['auth'],
  steps: [
    {
      name: 'POST /auth/register',
      run: async ({ client, vars, log }) => {
        const email = uniqEmail();
        const password = 'TestPass!234';
        const { result, durationMs } = await timed(() =>
          client.post('/auth/register', {
            email,
            password,
            name: 'E2E User',
          }),
        );
        assertStatus(result, [200, 201]);
        const d = result.data?.data ?? {};
        vars.email = email;
        vars.password = password;
        vars.accessToken = d.tokens?.accessToken;
        vars.refreshToken = d.tokens?.refreshToken;
        vars.userId = d.user?.id;
        if (!vars.accessToken || !vars.refreshToken) {
          throw new Error(`register did not return tokens: ${JSON.stringify(d).slice(0, 200)}`);
        }
        log('info', 'registered', { email, userId: vars.userId });
        return { ok: true, status: result.status, durationMs, detail: `email=${email}` };
      },
    },
    {
      name: 'POST /auth/login with returned creds',
      run: async ({ client, vars }) => {
        const { result, durationMs } = await timed(() =>
          client.post('/auth/login', { email: vars.email, password: vars.password }),
        );
        assertStatus(result, 200);
        const d = result.data?.data ?? {};
        vars.accessToken = d.tokens?.accessToken;
        vars.refreshToken = d.tokens?.refreshToken;
        if (!vars.accessToken) throw new Error('no accessToken in login response');
        return { ok: true, status: result.status, durationMs };
      },
    },
    {
      name: 'GET /auth/me with access token',
      run: async ({ client, vars }) => {
        const { result, durationMs } = await timed(() =>
          client.get('/auth/me', { headers: { Authorization: `Bearer ${vars.accessToken}` } }),
        );
        assertStatus(result, 200);
        const me = result.data?.data?.user;
        if (!me?.id) throw new Error('me missing user.id');
        return { ok: true, status: result.status, durationMs, detail: `email=${me.email}` };
      },
    },
    {
      name: 'POST /auth/refresh rotates the refresh token',
      run: async ({ client, vars }) => {
        const before = vars.refreshToken;
        const { result, durationMs } = await timed(() =>
          client.post('/auth/refresh', { refreshToken: before }),
        );
        assertStatus(result, 200);
        const d = result.data?.data ?? {};
        if (!d.tokens?.accessToken) throw new Error('refresh did not return tokens.accessToken');
        if (d.tokens.refreshToken === before) throw new Error('refresh token was not rotated');
        vars.accessToken = d.tokens.accessToken;
        vars.refreshToken = d.tokens.refreshToken;
        return { ok: true, status: result.status, durationMs };
      },
    },
    {
      name: 'GET /auth/me with bogus token returns 401',
      run: async ({ client }) => {
        const { result, durationMs } = await timed(() =>
          client.get('/auth/me', { headers: { Authorization: 'Bearer not-a-real-token' } }),
        );
        assertStatus(result, 401);
        if (!result.data?.error?.code) throw new Error('no error.code on 401');
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
