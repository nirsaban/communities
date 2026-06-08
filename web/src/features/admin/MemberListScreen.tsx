import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { RoleBadge, type RoleKind } from '../../components/Pill';
import { Shimmer } from '../../components/Shimmer';
import { useCommunityMembers, useMyCommunities, type MembershipRole } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';

const ROLE_MAP: Record<string, RoleKind> = {
  admin: 'admin',
  subadmin: 'sub',
  eventManager: 'em',
  member: 'member',
};

type Filter = 'all' | 'admins' | 'em' | 'members' | 'new';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  admins: 'Admins',
  em: 'Event Mgrs',
  members: 'Members',
  new: 'New',
};

function isRecent(iso: string): boolean {
  if (!iso) return false;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return days <= 30;
}

function joinedLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.toLocaleString('en-US', { month: 'short' });
  return `Joined ${m} ${d.getFullYear()}`;
}

function matchesFilter(role: MembershipRole, joinedAt: string, f: Filter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'admins':
      return role === 'admin' || role === 'subadmin';
    case 'em':
      return role === 'eventManager';
    case 'members':
      return role === 'member';
    case 'new':
      return isRecent(joinedAt);
  }
}

export function MemberListScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useCommunityMembers(cid);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((m) => matchesFilter(m.role, m.joinedAt, filter))
      .filter((m) => {
        if (!term) return true;
        return (
          m.user?.name?.toLowerCase().includes(term) ||
          m.user?.email?.toLowerCase().includes(term)
        );
      });
  }, [data, q, filter]);

  const totalCount = data?.length ?? 0;

  return (
    <Screen>
      <AppBar
        back
        title={isLoading ? 'Members' : `Members · ${totalCount.toLocaleString()}`}
        trailing={
          <AppButton size="sm" block={false} onClick={() => nav('/admin/members/invite')}>
            Invite
          </AppButton>
        }
      />
      <main className="flex-1 px-5 pb-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leadingIcon="search"
          placeholder="Search members…"
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="chip"
              style={{
                background: filter === f ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
                color: filter === f ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
                borderColor: 'transparent',
                height: 32,
                flexShrink: 0,
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState icon="group_off" title="No members found" body="Try a different search or filter" />
        )}

        <div className="flex flex-col">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => nav(`/admin/members/${m.user.id}`)}
              className="list-row flex items-center gap-3 text-start"
            >
              <Avatar name={m.user?.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="t-label-lg truncate">{m.user?.name}</div>
                <div
                  className="t-body-md truncate"
                  style={{ margin: 0, fontSize: 11, color: 'rgb(var(--muted))' }}
                >
                  {joinedLabel(m.joinedAt)}
                </div>
              </div>
              <RoleBadge role={ROLE_MAP[m.role] ?? 'member'} />
            </button>
          ))}
        </div>
      </main>
    </Screen>
  );
}
