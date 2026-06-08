import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { Shimmer } from '../../components/Shimmer';
import { useSuperCommunities } from '../../lib/queries';

type Filter = 'all' | 'active' | 'suspended' | 'new';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'new', label: 'New' },
];

// Status chip colour by community status. Mirrors design class names.
function StatusChip({ status }: { status: 'active' | 'suspended' | 'deleted' | 'trial' }) {
  if (status === 'active') return <span className="status-chip sc-pub" style={{ height: 19, fontSize: 10 }}>Active</span>;
  if (status === 'trial') return <span className="status-chip sc-draft" style={{ height: 19, fontSize: 10 }}>Trial</span>;
  if (status === 'suspended')
    return (
      <span
        className="status-chip sc-cancel"
        style={{ height: 19, fontSize: 10, background: 'rgb(var(--error-wash))', color: 'rgb(var(--error))' }}
      >
        Suspended
      </span>
    );
  return <span className="status-chip sc-done" style={{ height: 19, fontSize: 10 }}>Deleted</span>;
}

export function SuperCommunitiesListScreen() {
  const nav = useNavigate();
  const { data, isLoading } = useSuperCommunities();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === 'active') return c.status === 'active';
      if (filter === 'suspended') return c.status === 'suspended';
      // "New" maps to communities with < 7d createdAt — we don't have a date in the row,
      // so it falls back to communities with low member counts as a heuristic.
      if (filter === 'new') return c.status === 'active' && (c.memberCount ?? 0) < 10;
      return true;
    });
  }, [data, q, filter]);

  const total = (data ?? []).length;

  return (
    <Screen>
      <AppBar
        title={`Communities · ${total}`}
        trailing={
          <button className="ic-btn" aria-label="Filter">
            <Icon name="tune" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6">
        <div
          className="flex items-center gap-2.5 px-3.5"
          style={{
            height: 44,
            background: 'rgb(var(--surface-2))',
            border: 'none',
            borderRadius: 999,
            marginBottom: 10,
          }}
        >
          <Icon name="search" className="text-muted" size={20} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities…"
            className="flex-1 bg-transparent border-0 outline-none text-sm"
            style={{ color: 'rgb(var(--on-bg))' }}
          />
        </div>

        <div className="hscroll" style={{ marginBottom: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`chip ${filter === f.id ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2 mt-2">
            <Shimmer style={{ height: 64 }} />
            <Shimmer style={{ height: 64 }} />
            <Shimmer style={{ height: 64 }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState icon="search_off" title="No communities" />
        )}

        <div className="flex flex-col">
          {filtered.map((c) => {
            const suspended = c.status === 'suspended';
            return (
              <button
                key={c.id}
                onClick={() => nav(`/super/communities/${c.id}`)}
                className="list-row flex items-center gap-3 text-start"
                style={suspended ? { opacity: 0.6 } : undefined}
              >
                <span
                  className="grid place-items-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: c.status === 'active' ? 'rgb(var(--brand))' : 'rgb(var(--surface-2))',
                    color: c.status === 'active' ? '#fff' : undefined,
                    flexShrink: 0,
                  }}
                >
                  <Icon name="hub" size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="t-label-lg truncate" style={suspended ? { opacity: 0.7 } : undefined}>
                    {c.name}
                  </div>
                  <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                    {c.memberCount != null ? `${c.memberCount.toLocaleString()} members` : `/${c.slug}`}
                  </div>
                </div>
                <StatusChip status={c.status as 'active' | 'suspended' | 'deleted'} />
              </button>
            );
          })}
        </div>
      </main>

      <button className="fab" onClick={() => nav('/super/communities/new')} aria-label="New community">
        <Icon name="add" />
        New
      </button>
    </Screen>
  );
}
