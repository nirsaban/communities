import { useState } from 'react';
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
  useNotifyMember,
  useRemoveMember,
  type MembershipRole,
} from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { useToast } from '../../components/Toast';
import { extractError } from '../../lib/api';

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
  const notify = useNotifyMember(cid);
  const toast = useToast();

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');

  // Confirmation modal state. We guard two destructive paths:
  //   1) Remove from community (irreversible: drops membership + RSVPs).
  //   2) Promoting to Community Admin (grants full money + delete power).
  // Demotions and lower-tier role changes commit immediately as before.
  const [confirm, setConfirm] = useState<
    | { kind: 'remove' }
    | { kind: 'promoteAdmin'; role: MembershipRole }
    | null
  >(null);

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
      <main className="flex-1 px-5 pb-6 content-md lg:px-8">
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
              onClick={() => {
                if (m.role === r.id) return;
                // Promoting someone to Community Admin gives full money, settings
                // and delete power. Force an explicit confirm.
                if (r.id === 'admin' && !isSubAdmin) {
                  setConfirm({ kind: 'promoteAdmin', role: r.id });
                  return;
                }
                changeRole.mutate({ uid: m.user.id, role: r.id as MembershipRole });
              }}
            >
              {r.label}
            </Chip>
          ))}
        </div>

        <AppButton
          variant="secondary"
          onClick={() => {
            setNotifyTitle('');
            setNotifyBody('');
            setNotifyOpen(true);
          }}
          style={{ marginBottom: 10 }}
        >
          <Icon name="send" size={18} />
          Send a notification
        </AppButton>

        <AppButton
          variant="danger"
          loading={remove.isPending}
          onClick={() => setConfirm({ kind: 'remove' })}
        >
          Remove from community
        </AppButton>
      </main>

      {notifyOpen && (
        <>
          <div className="scrim" onClick={() => setNotifyOpen(false)} />
          <div className="dialog">
            <div className="t-title-lg" style={{ marginBottom: 8 }}>
              Notify {m.user.name}
            </div>
            <p className="t-body-md" style={{ margin: '0 0 12px' }}>
              They'll see this in their inbox as a notification from the
              community.
            </p>
            <div className="field">
              <label>Title</label>
              <div className="control">
                <input
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder="Quick heads-up"
                  className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="field">
              <label>Message (optional)</label>
              <div
                className="control"
                style={{ alignItems: 'stretch', padding: 10, minHeight: 90 }}
              >
                <textarea
                  value={notifyBody}
                  onChange={(e) => setNotifyBody(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add a short note"
                  className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                />
              </div>
              <div className="hint">{notifyBody.length}/1000</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <AppButton variant="secondary" onClick={() => setNotifyOpen(false)}>
                Cancel
              </AppButton>
              <AppButton
                variant="primary"
                loading={notify.isPending}
                disabled={!notifyTitle.trim() || notify.isPending}
                onClick={() => {
                  notify.mutate(
                    {
                      uid: m.user.id,
                      title: notifyTitle.trim(),
                      body: notifyBody.trim() || undefined,
                    },
                    {
                      onSuccess: () => {
                        toast.success(`Notification sent to ${m.user.name}`);
                        setNotifyOpen(false);
                      },
                      onError: (err) => toast.error(extractError(err).message),
                    },
                  );
                }}
              >
                Send
              </AppButton>
            </div>
          </div>
        </>
      )}

      {confirm && (
        <>
          <div className="scrim" onClick={() => setConfirm(null)} />
          <div className="dialog">
            <div
              className="blob"
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background:
                  confirm.kind === 'remove'
                    ? 'rgb(var(--error-wash))'
                    : 'rgb(var(--brand-wash))',
                color:
                  confirm.kind === 'remove'
                    ? 'rgb(var(--error))'
                    : 'rgb(var(--brand-ink))',
                margin: '0 auto 14px',
              }}
            >
              <Icon
                name={confirm.kind === 'remove' ? 'person_remove' : 'shield_person'}
                size={28}
              />
            </div>
            <div className="t-title-lg center" style={{ marginBottom: 6 }}>
              {confirm.kind === 'remove'
                ? `Remove ${m.user.name}?`
                : `Make ${m.user.name} a Community Admin?`}
            </div>
            <p className="t-body-md center" style={{ margin: '0 0 16px' }}>
              {confirm.kind === 'remove'
                ? 'They lose access immediately. Their RSVPs, posts and payment history are kept but anonymized in lists.'
                : 'They will get full access to finances, settings, branding, members and can delete the community. This can be reversed.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <AppButton variant="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </AppButton>
              {confirm.kind === 'remove' ? (
                <AppButton
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    remove.mutate(m.user.id, {
                      onSuccess: () => {
                        setConfirm(null);
                        nav(-1);
                      },
                    });
                  }}
                >
                  Remove
                </AppButton>
              ) : (
                <AppButton
                  variant="primary"
                  loading={changeRole.isPending}
                  onClick={() => {
                    changeRole.mutate(
                      { uid: m.user.id, role: confirm.role },
                      { onSuccess: () => setConfirm(null) },
                    );
                  }}
                >
                  Promote
                </AppButton>
              )}
            </div>
          </div>
        </>
      )}
    </Screen>
  );
}
