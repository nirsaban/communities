import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { communityContext } from '../../lib/community-context';
import {
  useChangeMemberRole,
  useCommunityMembers,
  useMyCommunities,
  type MembershipRole,
} from '../../lib/queries';

// Backend enum (Membership.role) uses snake_case for event_manager.
type BackendRole = 'admin' | 'subadmin' | 'event_manager' | 'member';

type Member = {
  id: string;
  user: { id: string; name?: string; email?: string; photoUrl?: string };
  role: string;
  status: string;
};

const ROLE_GROUPS: Array<{
  id: BackendRole;
  title: string;
  pillClass: string;
  scopeNote: string;
  icon?: string;
}> = [
  {
    id: 'admin',
    title: 'Admins',
    pillClass: 'role-badge rb-admin',
    scopeNote: 'Full access · owner',
  },
  {
    id: 'subadmin',
    title: 'Sub Admins',
    pillClass: 'role-badge rb-sub',
    scopeNote: 'No financial access',
  },
  {
    id: 'event_manager',
    title: 'Event Managers',
    pillClass: 'role-badge rb-em',
    scopeNote: 'Manages assigned events',
    icon: 'event',
  },
];

function matchesRole(memberRole: string, group: BackendRole): boolean {
  if (group === 'event_manager') return memberRole === 'event_manager' || memberRole === 'eventManager';
  return memberRole === group;
}

export function RoleManagementScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isAdmin = myRole === 'admin';
  const { data: members, isLoading } = useCommunityMembers(cid);
  const change = useChangeMemberRole(cid);
  const [search, setSearch] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const filtered = ((members ?? []) as Member[]).filter((m) => {
    if (m.status !== 'active') return false;
    if (!search.trim()) return true;
    const t = search.trim().toLowerCase();
    return (
      m.user.name?.toLowerCase().includes(t) ||
      m.user.email?.toLowerCase().includes(t)
    );
  });

  if (isLoading) {
    return (
      <Screen>
        <AppBar back title="Roles & permissions" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Roles & permissions" />
      <main className="flex-1 px-5 pb-6 overflow-y-auto content-wide lg:px-8">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon="search"
          placeholder="Search members…"
        />

        {filtered.length === 0 && <EmptyState icon="group" title="No members found" />}

        {ROLE_GROUPS.map((group) => {
          const groupMembers = filtered.filter((m) => matchesRole(String(m.role), group.id));
          return (
            <section key={group.id} className="mb-4">
              <div className="flex items-center justify-between" style={{ margin: '12px 0 8px' }}>
                <span className="t-label-sm" style={{ margin: 0 }}>
                  {group.title} · {groupMembers.length}
                </span>
              </div>
              {groupMembers.length === 0 ? (
                <div
                  className="t-body-md p-3 text-center"
                  style={{
                    margin: 0,
                    background: 'rgb(var(--surface-2))',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                >
                  No one in this role yet.
                </div>
              ) : (
                groupMembers.map((m, idx) => {
                  const isOwn = m.user.id === mine?.find((mm) => mm.community.id === cid)?.membership.id;
                  return (
                    <div
                      key={m.id}
                      className="list-row"
                      style={{ border: idx === groupMembers.length - 1 ? 'none' : undefined }}
                    >
                      <Avatar name={m.user.name} src={m.user.photoUrl} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="t-label-lg truncate">{m.user.name ?? m.user.email}</div>
                        <div
                          className="t-body-md truncate"
                          style={{ margin: 0, fontSize: 11 }}
                        >
                          {isOwn && group.id === 'admin' ? 'You · owner' : group.scopeNote}
                        </div>
                      </div>
                      <span className={group.pillClass}>
                        {group.icon && <Icon name={group.icon} size={13} />}
                        {group.id === 'admin'
                          ? 'Admin'
                          : group.id === 'subadmin'
                          ? 'Sub Admin'
                          : 'Mgr'}
                      </span>
                      {!isOwn && (
                        <button
                          className="ic-btn"
                          onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                          aria-label="More"
                        >
                          <Icon name="more_vert" size={16} style={{ color: 'rgb(var(--muted))' }} />
                        </button>
                      )}
                      {menuFor === m.id && (
                        <div
                          className="absolute card p-2 z-30"
                          style={{
                            right: 16,
                            background: 'rgb(var(--surface))',
                            border: '1px solid rgb(var(--border))',
                            borderRadius: 12,
                            boxShadow: 'var(--shadow-mid)',
                            minWidth: 180,
                          }}
                        >
                          {(['admin', 'subadmin', 'event_manager', 'member'] as BackendRole[])
                            .filter((r) => r !== group.id)
                            .filter((r) => isAdmin || r !== 'admin')
                            .map((r) => (
                              <button
                                key={r}
                                onClick={() => {
                                  change.mutate(
                                    { uid: m.user.id, role: r as unknown as MembershipRole },
                                    { onSuccess: () => setMenuFor(null) },
                                  );
                                }}
                                className="flex items-center gap-2 px-2 py-2 w-full text-start"
                                style={{
                                  background: 'transparent',
                                  border: 0,
                                  cursor: 'pointer',
                                  borderRadius: 8,
                                  fontSize: 13,
                                }}
                              >
                                <Icon
                                  name={
                                    r === 'admin'
                                      ? 'shield_person'
                                      : r === 'subadmin'
                                      ? 'shield'
                                      : r === 'event_manager'
                                      ? 'event'
                                      : 'person'
                                  }
                                  size={14}
                                />
                                {r === 'admin'
                                  ? 'Make admin'
                                  : r === 'subadmin'
                                  ? 'Make sub admin'
                                  : r === 'event_manager'
                                  ? 'Make event manager'
                                  : 'Demote to member'}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          );
        })}

        <AppButton
          variant="primary"
          onClick={() => nav('/admin/members/invite')}
          className="mt-3"
        >
          <Icon name="person_add" size={16} />
          Promote a member
        </AppButton>
      </main>
    </Screen>
  );
}
