import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { ScenarioSummary } from '../types';
import { Card, CardBody, CardHeader, Empty, Mono, Pill, Stat } from '../components/ui';

type StepLine = {
  i: number;
  name: string;
  ok?: boolean;
  status?: number;
  durationMs?: number;
  detail?: string;
  running?: boolean;
  body?: unknown;
};

type RunState = {
  scenarioId: string;
  steps: StepLine[];
  logs: Array<{ level: string; msg: string; extra?: unknown }>;
  summary: null | { passed: number; failed: number; total: number; totalMs: number; wallMs: number };
  done: boolean;
};

export default function E2EPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    api<ScenarioSummary[]>('/api/e2e/scenarios')
      .then(setScenarios)
      .catch(() => {});
    return () => {
      esRef.current?.close();
    };
  }, []);

  function start(id: string): void {
    esRef.current?.close();
    setActive(id);
    setRun({ scenarioId: id, steps: [], logs: [], summary: null, done: false });
    const es = new EventSource(`/api/e2e/run?id=${encodeURIComponent(id)}`);
    esRef.current = es;
    es.addEventListener('start', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { steps: string[] };
      setRun((prev) =>
        prev
          ? {
              ...prev,
              steps: data.steps.map((name, i) => ({ i, name })),
            }
          : prev,
      );
    });
    es.addEventListener('step:start', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { i: number };
      setRun((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) => (s.i === data.i ? { ...s, running: true } : s)),
            }
          : prev,
      );
    });
    es.addEventListener('step:end', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as StepLine;
      setRun((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) =>
                s.i === data.i ? { ...s, ...data, running: false } : s,
              ),
            }
          : prev,
      );
    });
    es.addEventListener('log', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as {
        level: string;
        msg: string;
        extra?: unknown;
      };
      setRun((prev) => (prev ? { ...prev, logs: [...prev.logs, data] } : prev));
    });
    es.addEventListener('summary', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as RunState['summary'];
      setRun((prev) => (prev ? { ...prev, summary: data } : prev));
    });
    es.addEventListener('done', () => {
      setRun((prev) => (prev ? { ...prev, done: true } : prev));
      es.close();
    });
    es.onerror = () => {
      setRun((prev) => (prev ? { ...prev, done: true } : prev));
      es.close();
    };
  }

  function runAll(): void {
    // Run sequentially so log/step output stays interleaved.
    void (async () => {
      for (const s of scenarios) {
        await new Promise<void>((resolve) => {
          start(s.id);
          const wait = setInterval(() => {
            // poll local state — done flips when SSE closes
            setRun((cur) => {
              if (cur?.done) {
                clearInterval(wait);
                resolve();
              }
              return cur;
            });
          }, 200);
        });
      }
    })();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <Card className="self-start">
        <CardHeader
          title={`Scenarios (${scenarios.length})`}
          hint="Hit the running backend"
          right={
            <button
              onClick={runAll}
              disabled={scenarios.length === 0}
              className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
            >
              Run all
            </button>
          }
        />
        <CardBody className="space-y-2">
          {scenarios.length === 0 && <Empty>loading…</Empty>}
          {scenarios.map((s) => (
            <div
              key={s.id}
              className={`cursor-pointer rounded-md border p-3 transition-colors ${
                active === s.id
                  ? 'border-sky-500/60 bg-sky-500/5'
                  : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
              }`}
              onClick={() => start(s.id)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-100">{s.title}</h3>
                <Mono className="text-ink-500">{s.stepCount} steps</Mono>
              </div>
              <p className="mt-1 text-xs text-ink-400">{s.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.tags.map((t) => (
                  <Pill key={t} tone={t === 'slow' ? 'warn' : 'neutral'}>
                    {t}
                  </Pill>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={active ? `Run · ${active}` : 'Select a scenario'}
          hint={active ? 'Streaming step results via SSE' : 'Click a scenario to start a run'}
          right={
            run?.summary && (
              <div className="flex items-center gap-2">
                <Pill tone={run.summary.failed === 0 ? 'ok' : 'bad'}>
                  {run.summary.passed}/{run.summary.total} passed
                </Pill>
                <Mono className="text-ink-500">{run.summary.wallMs}ms</Mono>
              </div>
            )
          }
        />
        <CardBody>
          {!run && <Empty>no run yet</Empty>}
          {run && (
            <div className="space-y-4">
              {run.summary && (
                <div className="grid grid-cols-4 gap-3">
                  <Stat label="Passed" value={run.summary.passed} tone="ok" />
                  <Stat
                    label="Failed"
                    value={run.summary.failed}
                    tone={run.summary.failed > 0 ? 'bad' : 'ok'}
                  />
                  <Stat label="Steps" value={run.summary.total} />
                  <Stat label="Wall time" value={`${run.summary.wallMs}ms`} />
                </div>
              )}
              <ol className="space-y-2">
                {run.steps.map((s) => {
                  const tone = s.running
                    ? 'info'
                    : s.ok === true
                      ? 'ok'
                      : s.ok === false
                        ? 'bad'
                        : 'neutral';
                  return (
                    <li
                      key={s.i}
                      className="rounded-md border border-ink-800 bg-ink-900/30 px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Pill tone={tone}>
                            {s.running
                              ? '…'
                              : s.ok === true
                                ? 'pass'
                                : s.ok === false
                                  ? 'fail'
                                  : 'pending'}
                          </Pill>
                          <span className="text-sm text-ink-100">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.status != null && <Mono className="text-ink-500">{s.status}</Mono>}
                          {s.durationMs != null && (
                            <Mono className="text-ink-500">{s.durationMs}ms</Mono>
                          )}
                        </div>
                      </div>
                      {s.detail && (
                        <div className="mt-1 break-all">
                          <Mono className="text-ink-400">{s.detail}</Mono>
                        </div>
                      )}
                      {s.body !== undefined && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-ink-500">
                            response body
                          </summary>
                          <pre className="mt-1 max-h-48 overflow-auto rounded bg-ink-950 p-2 text-[11px] text-ink-300">
                            {JSON.stringify(s.body, null, 2)}
                          </pre>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
              {run.logs.length > 0 && (
                <div className="rounded-md border border-ink-800 bg-ink-950/60 p-3">
                  <h4 className="mb-2 text-[10px] uppercase tracking-wider text-ink-500">
                    log stream
                  </h4>
                  <div className="max-h-40 space-y-0.5 overflow-auto">
                    {run.logs.map((l, i) => (
                      <div key={i} className="text-[11px] text-ink-400">
                        <Mono className="text-ink-500">[{l.level}]</Mono> {l.msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
