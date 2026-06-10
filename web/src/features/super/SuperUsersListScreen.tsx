import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import { useSuperUsers } from '../../lib/queries';

type Filter = 'all' | 'admins' | 'disabled';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'admins', label: 'Admins' },
  { id: 'disabled', label: 'Disabled' },
];

const ROLE_BADGE: Record<string, { className: string; label: string }> = {
  superadmin: { className: 'role-badge rb-super', label: 'Super' },
  admin: { className: 'role-badge rb-admin', label: 'Admin' },
  subadmin: { className: 'role-badge rb-sub', label: 'Sub' },
  event_manager: { className: 'role-badge rb-em', label: 'Event Mgr' },
  member: { className: 'role-badge rb-member', label: 'Member' },
};

export function SuperUsersListScreen() {
  const nav = useNavigate();
  const { data, isLoading } = useSuperUsers();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((u) => {
      if (
        q &&
        !u.name?.toLowerCase().includes(q.toLowerCase()) &&
        !u.email?.toLowerCase().includes(q.toLowerCase())
      ) {
        return false;
      }
      if (filter === 'admins') {
        return u.globalRole === 'superadmin' || u.topRole === 'admin' || u.topRole === 'subadmin';
      }
      if (filter === 'disabled') return u.status === 'disabled';
      return true;
    });
  }, [data, q, filter]);

  // Display total in topbar. Helpful when search/filter is active.
  const total = (data ?? []).length;
  const fmtTotal = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);

  return (
    <Screen>
      <AppBar title={`Users · ${fmtTotal}`} />
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
            placeholder="Search by name or email…"
            className="flex-1 bg-transparent border-0 outline-none text-sm"
            style={{ color: 'rgb(var(--on-bg))' }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="grid place-items-center"
              style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4 }}
              aria-label="Clear search"
            >
              <Icon name="close" size={18} className="text-muted" />
            </button>
          )}
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
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
          </div>
        )}
        {!isLoading && filtered.length === 0 && <EmptyState icon="person_off" title="No users found" />}

        <div className="flex flex-col">
          {filtered.map((u) => {
            const disabled = u.status === 'disabled';
            const role =
              u.globalRole === 'superadmin'
                ? ROLE_BADGE.superadmin
                : ROLE_BADGE[u.topRole ?? 'member'] ?? ROLE_BADGE.member;
            return (
              <button
                key={u.id}
                onClick={() => nav(`/super/users/${u.id}`)}
                className="list-row flex items-center gap-3 text-start"
                style={disabled ? { opacity: 0.6 } : undefined}
              >
                <Avatar name={u.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="t-label-lg truncate" style={disabled ? { opacity: 0.7 } : undefined}>
                    {u.name}
                  </div>
                  <div className="t-body-md truncate" style={{ margin: 0, fontSize: 11 }} dir="ltr">
                    {u.email}
                    {typeof u.membershipCount === 'number' &&
                      ` · ${u.membershipCount} ${u.membershipCount === 1 ? 'community' : 'communities'}`}
                  </div>
                </div>
                {disabled ? (
                  <span
                    className="status-chip sc-cancel"
                    style={{
                      height: 19,
                      fontSize: 10,
                      background: 'rgb(var(--error-wash))',
                      color: 'rgb(var(--error))',
                    }}
                  >
                    Disabled
                  </span>
                ) : (
                  <span className={role.className} style={{ height: 19, fontSize: 10 }}>
                    {role.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>

    </Screen>
  );
}
