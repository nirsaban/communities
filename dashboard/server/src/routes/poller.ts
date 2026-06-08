import { makeBackendClient } from '../lib/backend.js';
import { healthRing, type HealthSample } from '../lib/metricsStore.js';
import { config } from '../config.js';

let timer: NodeJS.Timeout | null = null;

export function startHealthPoller(): void {
  if (timer) return;
  const tick = async (): Promise<void> => {
    const t0 = Date.now();
    const client = makeBackendClient();
    let sample: HealthSample = { t: Date.now(), ok: false, db: 'unknown', latencyMs: 0, uptime: null };
    try {
      const r = await client.get('/health');
      const latencyMs = Date.now() - t0;
      sample = {
        t: Date.now(),
        ok: r.status === 200,
        db: r.data?.data?.db ?? 'unknown',
        latencyMs,
        uptime: typeof r.data?.data?.uptime === 'number' ? r.data.data.uptime : null,
      };
    } catch {
      sample.latencyMs = Date.now() - t0;
    }
    healthRing.push(sample);
  };
  // Fire once immediately so the ring isn't empty on first page load.
  void tick();
  timer = setInterval(() => void tick(), config.pollIntervalMs);
  // Don't keep the process alive just for polling.
  timer.unref?.();
}

export function stopHealthPoller(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
