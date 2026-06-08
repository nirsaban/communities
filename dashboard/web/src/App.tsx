import { useEffect, useState } from 'react';
import { Tabs, type Tab } from './components/Tabs';
import { Pill } from './components/ui';
import SystemPage from './pages/SystemPage';
import MonitorPage from './pages/MonitorPage';
import E2EPage from './pages/E2EPage';

const TABS: Tab[] = [
  { id: 'system', label: 'System', description: 'Routes, models, services, jobs, invariants' },
  { id: 'monitor', label: 'Monitor', description: 'Health, DB, metrics, log tail' },
  { id: 'e2e', label: 'E2E', description: 'Scenario runner against the local backend' },
];

export default function App() {
  const [tab, setTab] = useState<string>(() => {
    return new URLSearchParams(location.search).get('tab') ?? 'system';
  });
  const [bffOk, setBffOk] = useState<boolean | null>(null);

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('tab', tab);
    history.replaceState({}, '', url);
  }, [tab]);

  useEffect(() => {
    let stop = false;
    const tick = async (): Promise<void> => {
      try {
        const r = await fetch('/api/ping');
        if (!stop) setBffOk(r.ok);
      } catch {
        if (!stop) setBffOk(false);
      }
    };
    void tick();
    const interval = setInterval(tick, 10_000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-full">
      <header className="border-b border-ink-800 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]" />
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-ink-50">Mission Control</h1>
              <p className="text-[11px] text-ink-500">
                Local-only devtool · Community SaaS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Pill tone={bffOk === null ? 'neutral' : bffOk ? 'ok' : 'bad'}>
              BFF {bffOk === null ? '…' : bffOk ? 'connected' : 'unreachable'}
            </Pill>
          </div>
        </div>
        <div className="mx-auto max-w-7xl">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'system' && <SystemPage />}
        {tab === 'monitor' && <MonitorPage />}
        {tab === 'e2e' && <E2EPage />}
      </main>
    </div>
  );
}
