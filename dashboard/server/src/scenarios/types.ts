import type { AxiosInstance, AxiosResponse } from 'axios';

export type Ctx = {
  client: AxiosInstance;
  vars: Record<string, unknown>;
  log: (level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) => void;
};

export type Step = {
  name: string;
  run: (ctx: Ctx) => Promise<StepResult>;
};

export type StepResult = {
  ok: boolean;
  status?: number;
  durationMs: number;
  detail?: string;
  body?: unknown;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  steps: Step[];
};

export async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const t0 = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - t0 };
}

export function assertStatus(res: AxiosResponse, want: number | number[]): void {
  const arr = Array.isArray(want) ? want : [want];
  if (!arr.includes(res.status)) {
    const body =
      typeof res.data === 'object' ? JSON.stringify(res.data).slice(0, 200) : String(res.data).slice(0, 200);
    throw new Error(`expected status ${arr.join('/')} got ${res.status}: ${body}`);
  }
}
