import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { SystemData } from '../types';
import { Card, CardBody, CardHeader, Mono, Pill, Stat, Empty } from '../components/ui';

const METHOD_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  GET: 'info',
  POST: 'ok',
  PATCH: 'warn',
  PUT: 'warn',
  DELETE: 'bad',
};

export default function SystemPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api<SystemData>('/api/system')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  const filteredRoutes = useMemo(() => {
    if (!data) return [];
    const f = filter.trim().toLowerCase();
    if (!f) return data.routes;
    return data.routes.filter(
      (r) =>
        r.path.toLowerCase().includes(f) ||
        r.method.toLowerCase().includes(f) ||
        r.middlewares.some((m) => m.toLowerCase().includes(f)),
    );
  }, [data, filter]);

  if (err) return <Empty>error loading system: {err}</Empty>;
  if (!data) return <Empty>loading system…</Empty>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="System overview" hint="Auto-generated from backend/src/" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Routes" value={data.counts.routes} hint="HTTP endpoints" />
            <Stat label="Models" value={data.counts.models} hint="Mongoose schemas" />
            <Stat label="Services" value={data.counts.services} hint="Business logic" />
            <Stat label="Jobs" value={data.counts.jobs} hint="node-cron" />
            <Stat label="Middleware" value={data.counts.middleware} hint="auth, RBAC, rate" />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-ink-400 sm:grid-cols-2">
            <div>
              <span className="text-ink-500">Backend</span> ·{' '}
              <Mono className="text-ink-200">{data.meta.backendUrl}</Mono>
            </div>
            <div>
              <span className="text-ink-500">API base</span> ·{' '}
              <Mono className="text-ink-200">{data.meta.apiBase}</Mono>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Architectural invariants"
          hint="From CLAUDE.md — every change must respect these"
        />
        <CardBody className="space-y-3">
          {data.invariants.map((inv) => (
            <div key={inv.id} className="rounded-md border border-ink-800 bg-ink-900/30 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink-100">{inv.title}</h3>
                <Mono className="text-ink-500">#{inv.id}</Mono>
              </div>
              <p className="mt-1 text-xs text-ink-300">{inv.body}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inv.enforcedBy.map((src) => (
                  <Pill key={src} tone="neutral">
                    <Mono>{src}</Mono>
                  </Pill>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Routes (${data.counts.routes})`}
          hint="Parsed from backend/src/routes/*"
          right={
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter…"
              className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-100 placeholder:text-ink-500 focus:border-sky-500 focus:outline-none"
            />
          }
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink-900/60 text-[10px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Path</th>
                <th className="px-4 py-2">Middlewares</th>
                <th className="px-4 py-2">File</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((r, i) => (
                <tr key={`${r.method}${r.path}-${i}`} className="border-t border-ink-800/60">
                  <td className="px-4 py-2">
                    <Pill tone={METHOD_TONE[r.method] ?? 'neutral'}>
                      <Mono>{r.method}</Mono>
                    </Pill>
                  </td>
                  <td className="px-4 py-2">
                    <Mono className="text-ink-100">{r.path}</Mono>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.middlewares.length === 0 ? (
                        <Mono className="text-ink-600">—</Mono>
                      ) : (
                        r.middlewares.map((m) => (
                          <Pill key={m} tone="neutral">
                            <Mono>{m}</Mono>
                          </Pill>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Mono className="text-ink-500">{r.file}</Mono>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Models (${data.counts.models})`} hint="Mongoose schemas" />
          <CardBody className="space-y-2">
            {data.models.map((m) => (
              <div key={m.name} className="rounded-md border border-ink-800 bg-ink-900/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-100">{m.name}</span>
                    {m.hasCommunityId && <Pill tone="info">communityId</Pill>}
                  </div>
                  <Mono className="text-ink-500">{m.file}</Mono>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.fields.slice(0, 18).map((f) => (
                    <Mono
                      key={f}
                      className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300"
                    >
                      {f}
                    </Mono>
                  ))}
                  {m.fields.length > 18 && (
                    <Mono className="text-ink-500">+{m.fields.length - 18} more</Mono>
                  )}
                </div>
                {m.indexes.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {m.indexes.slice(0, 4).map((ix, i) => (
                      <Mono key={i} className="block text-[11px] text-ink-500">
                        idx · {ix}
                      </Mono>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Services (${data.counts.services})`} hint="Business logic layer" />
          <CardBody className="space-y-2">
            {data.services.map((s) => (
              <div key={s.name} className="rounded-md border border-ink-800 bg-ink-900/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-100">{s.name}</span>
                  <Mono className="text-ink-500">{s.file}</Mono>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.exports.map((e) => (
                    <Mono
                      key={e}
                      className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300"
                    >
                      {e}()
                    </Mono>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Jobs (${data.counts.jobs})`} hint="Scheduled tasks (node-cron)" />
          <CardBody className="space-y-2">
            {data.jobs.map((j) => (
              <div key={j.name} className="rounded-md border border-ink-800 bg-ink-900/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-100">{j.name}</span>
                  <Mono className="text-ink-500">{j.file}</Mono>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {j.exports.map((e) => (
                    <Mono
                      key={e}
                      className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300"
                    >
                      {e}()
                    </Mono>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Middleware (${data.counts.middleware})`}
            hint="Auth, RBAC, validation, rate limiting"
          />
          <CardBody className="space-y-2">
            {data.middleware.map((m) => (
              <div key={m.name} className="rounded-md border border-ink-800 bg-ink-900/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-100">{m.name}</span>
                  <Mono className="text-ink-500">{m.file}</Mono>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.exports.map((e) => (
                    <Mono
                      key={e}
                      className="rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-300"
                    >
                      {e}
                    </Mono>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
