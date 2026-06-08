import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { Pill } from '../../components/Pill';
import { api, extractError } from '../../lib/api';
import {
  useAssignManager,
  useCommunityMembers,
  useRemoveManager,
} from '../../lib/queries';

export function AssignManagersScreen() {
  const { eid } = useParams<{ eid: string }>();
  const [cid, setCid] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [managers, setManagers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const { data: members } = useCommunityMembers(cid ?? undefined);
  const assign = useAssignManager(eid);
  const remove = useRemoveManager(eid);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const ev = r.data?.data ?? {};
        setCid(String(ev.communityId ?? ''));
        setEventTitle(String(ev.title ?? ''));
        setManagers(((ev.managers as string[]) ?? []).map(String));
      } catch (err) {
        setError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  const filtered = useMemo(() => {
    if (!members) return [];
    const term = q.trim().toLowerCase();
    return members
      .filter((m) => m.status === 'active')
      .filter((m) => {
        if (!term) return true;
        return (
          m.user.name?.toLowerCase().includes(term) ||
          m.user.email?.toLowerCase().includes(term)
        );
      });
  }, [members, q]);

  async function toggle(userId: string, currentlyManager: boolean): Promise<void> {
    setError(null);
    try {
      if (currentlyManager) {
        await remove.mutateAsync(userId);
        setManagers((prev) => prev.filter((id) => id !== userId));
      } else {
        await assign.mutateAsync(userId);
        setManagers((prev) => [...prev, userId]);
      }
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Event managers" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Assign Event Manager" />
      <main className="flex-1 px-5 pb-6">
        {eventTitle && (
          <p
            className="t-body-md"
            style={{ margin: '0 0 12px', color: 'rgb(var(--muted))' }}
          >
            For {eventTitle}
          </p>
        )}

        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leadingIcon="search"
          placeholder="Search members…"
        />

        {filtered.length === 0 && (
          <EmptyState icon="group" title="No members found" body="Try a different search" />
        )}

        <div className="flex flex-col mt-2">
          {filtered.map((m) => {
            const isManager = managers.includes(m.user.id);
            return (
              <div key={m.id} className="list-row flex items-center gap-3 text-start">
                <Avatar name={m.user.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="t-label-lg truncate">{m.user.name}</div>
                  <div className="t-body-md truncate" style={{ margin: 0, fontSize: 11 }} dir="ltr">
                    {m.user.email}
                  </div>
                </div>
                {m.role === 'admin' && <Pill tone="brand">Community admin</Pill>}
                {m.role === 'subadmin' && <Pill tone="brand">Limited admin</Pill>}
                <button
                  onClick={() => toggle(m.user.id, isManager)}
                  className="chip"
                  style={{
                    background: isManager ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
                    color: isManager ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
                    borderColor: 'transparent',
                    height: 32,
                  }}
                  disabled={assign.isPending || remove.isPending}
                >
                  <Icon name={isManager ? 'check' : 'add'} size={14} />
                  {isManager ? 'Manager' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}
