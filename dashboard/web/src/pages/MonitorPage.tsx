import { useEffect, useState } from 'react';
import { api } from '../api';
import type { CollectionRow, HealthData, HealthSample } from '../types';
import { Card, CardBody, CardHeader, Empty, Mono, Pill, Stat } from '../components/ui';
import { Sparkline } from '../components/Sparkline';

type DbInfo = {
  host: string | null;
  version: string | null;
  uptimeSec: number | null;
  connections: { current?: number; available?: number } | null;
  dbName: string;
  dbSizeBytes: number | null;
  storageBytes: number | null;
  collections: number | null;
  indexes: number | null;
};

type MetricsResponse =
  | { enabled: false; hint: string }
  | {
      enabled: true;
      requests: number;
      errors: number;
      byStatus: Record<string, number>;
      byRoute: Array<{ route: string; count: number; p50: number; p95: number }>;
      latencyMs: { p50: number; p95: number; p99: number };
      since: number;
    };

function fmtBytes(n: number | null): string {
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v > 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function fmtUptime(s: number | null): string {
  if (s == null) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default function MonitorPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<HealthSample[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async (): Promise<void> => {
      try {
        const [h, hist, m] = await Promise.all([
          api<HealthData>('/api/health'),
          api<HealthSample[]>('/api/health/history'),
          api<MetricsResponse>('/api/metrics').catch(() => null as unknown as MetricsResponse),
        ]);
        if (stop) return;
        setHealth(h);
        setHistory(hist);
        setMetrics(m);
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
    };
    void tick();
    const interval = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    api<CollectionRow[]>('/api/db/collections').then(setCollections).catch(() => {});
    api<DbInfo>('/api/db/server-info').then(setDbInfo).catch(() => {});
  }, []);

  if (err && !health) return <Empty>BFF error: {err}</Empty>;

  const series = history.map((h) => ({
    t: h.t,
    latency: h.latencyMs,
    up: h.ok ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Service health"
          hint="Polled every 5s — backend /api/v1/health + direct Mongo ping"
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Backend"
              value={health?.backend.ok ? 'UP' : 'DOWN'}
              hint={health?.backend.error ?? `status ${health?.backend.status ?? '—'}`}
              tone={health?.backend.ok ? 'ok' : 'bad'}
            />
            <Stat
              label="Mongo (direct)"
              value={health?.mongo.ok ? 'UP' : 'DOWN'}
              hint={`ping ${health?.mongo.pingMs ?? '—'}ms`}
              tone={health?.mongo.ok ? 'ok' : 'bad'}
            />
            <Stat
              label="Backend uptime"
              value={fmtUptime(health?.backend.uptime ?? null)}
              hint={health?.backend.version ? `v${health.backend.version}` : '—'}
            />
            <Stat
              label="Health latency"
              value={`${health?.backend.latencyMs ?? '—'}ms`}
              hint="BFF → backend round trip"
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Health latency (last 2 min)" hint="ms per /health probe" />
          <CardBody>
            <Sparkline data={series} dataKey="latency" stroke="#38bdf8" height={120} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Uptime signal" hint="1 = up, 0 = unreachable" />
          <CardBody>
            <Sparkline data={series} dataKey="up" stroke="#22c55e" height={120} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Backend metrics"
          hint={metrics?.enabled ? 'Real counters from in-process middleware' : 'Opt-in middleware'}
          right={
            metrics ? (
              <Pill tone={metrics.enabled ? 'ok' : 'warn'}>
                {metrics.enabled ? 'live' : 'disabled'}
              </Pill>
            ) : null
          }
        />
        <CardBody>
          {!metrics && <Empty>loading…</Empty>}
          {metrics && !metrics.enabled && (
            <div className="text-xs text-ink-400">
              <p>
                The dashboard metrics endpoint isn't mounted on the backend yet. To enable real
                request-rate, latency, and error counters:
              </p>
              <ol className="mt-2 list-decimal pl-5 text-ink-300">
                <li>
                  Add <Mono className="text-emerald-300">DASHBOARD_METRICS=1</Mono> to{' '}
                  <Mono>backend/.env</Mono>
                </li>
                <li>Restart the backend</li>
              </ol>
              <p className="mt-2 text-ink-500">{metrics.hint}</p>
            </div>
          )}
          {metrics?.enabled && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="Requests" value={metrics.requests.toLocaleString()} />
                <Stat
                  label="Errors"
                  value={metrics.errors.toLocaleString()}
                  tone={metrics.errors > 0 ? 'warn' : 'ok'}
                />
                <Stat label="p50" value={`${metrics.latencyMs.p50}ms`} />
                <Stat label="p95" value={`${metrics.latencyMs.p95}ms`} />
                <Stat label="p99" value={`${metrics.latencyMs.p99}ms`} />
              </div>
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Top routes
                </h3>
                <div className="overflow-x-auto rounded-md border border-ink-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ink-900/60 text-[10px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-3 py-2">Route</th>
                        <th className="px-3 py-2 text-right">Count</th>
                        <th className="px-3 py-2 text-right">p50</th>
                        <th className="px-3 py-2 text-right">p95</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.byRoute.slice(0, 12).map((r) => (
                        <tr key={r.route} className="border-t border-ink-800/60">
                          <td className="px-3 py-2">
                            <Mono className="text-ink-100">{r.route}</Mono>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.p50}ms</td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.p95}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="MongoDB" hint="Direct connection from the BFF" />
          <CardBody>
            {!dbInfo && <Empty>—</Empty>}
            {dbInfo && (
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Host</dt>
                  <dd className="text-right">
                    <Mono className="text-ink-200">{dbInfo.host ?? '—'}</Mono>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Version</dt>
                  <dd>
                    <Mono className="text-ink-200">{dbInfo.version ?? '—'}</Mono>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">DB</dt>
                  <dd>
                    <Mono className="text-ink-200">{dbInfo.dbName}</Mono>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Uptime</dt>
                  <dd className="text-ink-200">{fmtUptime(dbInfo.uptimeSec)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Connections</dt>
                  <dd className="text-ink-200">
                    {dbInfo.connections?.current ?? '—'} / {dbInfo.connections?.available ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Data size</dt>
                  <dd className="text-ink-200">{fmtBytes(dbInfo.dbSizeBytes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Storage</dt>
                  <dd className="text-ink-200">{fmtBytes(dbInfo.storageBytes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Collections / Indexes</dt>
                  <dd className="text-ink-200">
                    {dbInfo.collections ?? '—'} / {dbInfo.indexes ?? '—'}
                  </dd>
                </div>
              </dl>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Collections"
            hint="Document counts in the configured database (estimated)"
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-900/60 text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-4 py-2">Collection</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((c) => (
                    <tr key={c.name} className="border-t border-ink-800/60">
                      <td className="px-4 py-2">
                        <Mono className="text-ink-100">{c.name}</Mono>
                      </td>
                      <td className="px-4 py-2">
                        {c.exists ? (
                          <Pill tone="ok">present</Pill>
                        ) : (
                          <Pill tone="neutral">empty</Pill>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {c.count === -1 ? '—' : c.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
