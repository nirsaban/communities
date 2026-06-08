import axios, { AxiosError, AxiosInstance } from 'axios';
import { authStore } from './auth';

const BASE = '/api/v1';

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const rt = authStore.getState().refreshToken;
  if (!rt) return null;
  try {
    const r = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt }, { timeout: 8000 });
    const tokens = r.data?.data?.tokens;
    if (!tokens?.accessToken || !tokens?.refreshToken) throw new Error('bad refresh');
    authStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    authStore.getState().logout();
    return null;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE,
  timeout: 12000,
});

api.interceptors.request.use((cfg) => {
  const at = authStore.getState().accessToken;
  if (at) cfg.headers.Authorization = `Bearer ${at}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (typeof err.config & { _retry?: boolean }) | undefined;
    if (err.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      if (!refreshPromise) refreshPromise = doRefresh().finally(() => (refreshPromise = null));
      const newAt = await refreshPromise;
      if (newAt) {
        original.headers!.Authorization = `Bearer ${newAt}`;
        return api.request(original);
      }
    }
    return Promise.reject(err);
  },
);

export type ApiError = { code: string; message: string; details?: unknown };

export function extractError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const e = err.response?.data?.error;
    if (e?.code) return e;
    return { code: 'NETWORK', message: err.message };
  }
  return { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
}

/** Unwrap `{ data }` envelope. */
export async function call<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const r = await p;
  return r.data.data;
}
