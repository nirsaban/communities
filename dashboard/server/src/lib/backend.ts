import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '../config.js';

export function makeBackendClient(opts: { token?: string } = {}): AxiosInstance {
  return axios.create({
    baseURL: `${config.backendUrl}${config.apiBase}`,
    timeout: 8000,
    validateStatus: () => true,
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
  });
}

export function describeAxiosError(err: unknown): { message: string; code?: string } {
  if (err instanceof AxiosError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: String(err) };
}
