import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Chip, RoleBadge, type RoleKind } from '../../components/Pill';
import {
  useChangeMemberRole,
  useCommunityMembers,
  useMyCommunities,
  useRemoveMember,
  type MembershipRole,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';

const ROLE_MAP: Record<string, RoleKind> = {
  admin: 'admin',
  subadmin: 'sub',
  eventManager: 'em',
  member: 'member',
};

function joinedLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.toLocaleString('en-US', { month: 'short' });
  return `joined ${m} ${d.getFullYear()}`;
}

export function MemberDetailScreen() {
  const { uid } = useParams<{ uid: string }>();
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((mc) => mc.community.id === cid)?.membership.role;
  const isSubAdmin = myRole === 'subadmin';
  const { data } = useCommunityMembers(cid);
  const m = data?.find((row) => row.user.id === uid);
  const changeRole = useChangeMemberRole(cid);
  const remove = useRemoveMember(cid);

  // PRD 05 §3: sub-admin can promote to Event Manager but not Sub-Admin or Admin.
  const ROLE_OPTIONS = [
    { id: 'member' as const, label: 'Member' },
    { id: 'eventManager' as const, label: 'Event manager' },
    ...(isSubAdmin
      ? []
      : ([
          { id: 'subadmin' as const, label: 'Limited admin' },
          { id: 'admin' as const, label: 'Community admin' },
        ] as const)),
  ];

  if (!m) {
    return (
      <Screen>
        <AppBar back title="Member" />
        <main className="px-5 pt-6 text-center text-muted">Not found</main>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Member" />
      <main className="flex-1 px-5 pb-6">
        {/* Centered profile card — design unit 49. */}
        <div className="flex flex-col items-center text-center mb-4">
          <Avatar name={m.user.name} size={64} />
          <h2 className="t-title-lg mt-3 mb-0.5">{m.user.name}</h2>
          <p
            className="t-body-md"
            style={{ margin: 0, fontSize: 12, color: 'rgb(var(--muted))' }}
            dir="ltr"
          >
            {m.user.email} · {joinedLabel(m.joinedAt)}
          </p>
          <div className="mt-2">
            <RoleBadge role={ROLE_MAP[m.role] ?? 'member'} />
          </div>
        </div>

        {/* Activity KPIs (placeholder counts until server-side join exists). */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <Card className="kpi" style={{ textAlign: 'center' }}>
            <div className="k-num font-display" style={{ fontSize: 24 }}>
              —
            </div>
            <div className="k-lbl" style={{ justifyContent: 'center' }}>
              Events attended
            </div>
          </Card>
          <Card className="kpi" style={{ textAlign: 'center' }}>
            <div className="k-num font-display" style={{ fontSize: 24 }}>
              —
            </div>
            <div className="k-lbl" style={{ justifyContent: 'center' }}>
              Initiatives
            </div>
          </Card>
        </div>

        {/* Lifetime spend guard — sub-admin only (admin sees this in Batch D Finances). */}
        {isSubAdmin && (
          <div
            className="card row mb-5 flex items-start gap-3"
            style={{
              padding: 12,
              background: 'rgb(var(--surface-2))',
              border: 'none',
            }}
          >
            <Icon name="lock" size={18} className="text-warn" />
            <div className="grow t-body-md" style={{ margin: 0, fontSize: 12 }}>
              Lifetime spend is visible to the Community Admin only.
            </div>
          </div>
        )}

        <div className="t-label-sm mb-2 mt-1">Change role</div>
        <div className="mb-5 flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((r) => (
            <Chip
              key={r.id}
              selected={m.role === r.id}
              onClick={() => changeRole.mutate({ uid: m.user.id, role: r.id as MembershipRole })}
            >
              {r.label}
            </Chip>
          ))}
        </div>

        <AppButton
          variant="danger"
          loading={remove.isPending}
          onClick={() => {
            remove.mutate(m.user.id, { onSuccess: () => nav(-1) });
          }}
        >
          Remove from community
        </AppButton>
      </main>
    </Screen>
  );
}
