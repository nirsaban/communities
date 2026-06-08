import type { Request, Response, NextFunction } from 'express';

// In-memory metrics store. Lives for the process lifetime. Opt-in: only the
// dashboard mounts the middleware + route, gated by DASHBOARD_METRICS=1.

type RouteBucket = {
  count: number;
  errors: number;
  samples: number[]; // ring buffer of latencies (ms)
};

const MAX_SAMPLES_PER_ROUTE = 500;
const MAX_GLOBAL_SAMPLES = 2000;

class MetricsStore {
  startedAt = Date.now();
  requests = 0;
  errors = 0;
  byStatus: Record<string, number> = {};
  routes = new Map<string, RouteBucket>();
  globalSamples: number[] = [];

  record(routeKey: string, status: number, durationMs: number): void {
    this.requests++;
    if (status >= 400) this.errors++;
    const sbucket = String(Math.floor(status / 100)) + 'xx';
    this.byStatus[sbucket] = (this.byStatus[sbucket] ?? 0) + 1;
    let r = this.routes.get(routeKey);
    if (!r) {
      r = { count: 0, errors: 0, samples: [] };
      this.routes.set(routeKey, r);
    }
    r.count++;
    if (status >= 400) r.errors++;
    r.samples.push(durationMs);
    if (r.samples.length > MAX_SAMPLES_PER_ROUTE) r.samples.shift();
    this.globalSamples.push(durationMs);
    if (this.globalSamples.length > MAX_GLOBAL_SAMPLES) this.globalSamples.shift();
  }

  snapshot(): {
    requests: number;
    errors: number;
    byStatus: Record<string, number>;
    latencyMs: { p50: number; p95: number; p99: number };
    byRoute: Array<{ route: string; count: number; errors: number; p50: number; p95: number }>;
    since: number;
  } {
    const sorted = [...this.globalSamples].sort((a, b) => a - b);
    return {
      requests: this.requests,
      errors: this.errors,
      byStatus: { ...this.byStatus },
      latencyMs: {
        p50: pct(sorted, 50),
        p95: pct(sorted, 95),
        p99: pct(sorted, 99),
      },
      byRoute: [...this.routes.entries()]
        .map(([route, r]) => {
          const s = [...r.samples].sort((a, b) => a - b);
          return {
            route,
            count: r.count,
            errors: r.errors,
            p50: pct(s, 50),
            p95: pct(s, 95),
          };
        })
        .sort((a, b) => b.count - a.count),
      since: this.startedAt,
    };
  }
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

export const metricsStore = new MetricsStore();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
    // Prefer route.path (e.g. "/:cid/events") over req.path (which has actual ids).
    const tmpl = req.route?.path ?? req.baseUrl ?? req.path;
    const key = `${req.method} ${req.baseUrl}${tmpl === req.baseUrl ? '' : tmpl}`;
    metricsStore.record(key, res.statusCode, durationMs);
  });
  next();
}
