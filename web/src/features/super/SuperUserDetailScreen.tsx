import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { extractError } from '../../lib/api';
import {
  useSuperDisableUser,
  useSuperEnableUser,
  useSuperForcePasswordReset,
  useSuperPromoteUser,
  useSuperUserDetail,
} from '../../lib/queries';

const ROLE_BADGE: Record<string, { className: string; label: string }> = {
  admin: { className: 'role-badge rb-admin', label: 'Admin' },
  subadmin: { className: 'role-badge rb-sub', label: 'Sub' },
  event_manager: { className: 'role-badge rb-em', label: 'Mgr' },
  eventManager: { className: 'role-badge rb-em', label: 'Mgr' },
  member: { className: 'role-badge rb-member', label: 'Member' },
};

function fmtMonthYear(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

// Bottom-half ID label per design ("ID usr_8fK2"). We display a slug of the
// Mongo ObjectId so it fits the visual.
function shortId(id: string): string {
  if (!id) return '';
  return `usr_${id.slice(-6)}`;
}

export function SuperUserDetailScreen() {
  const { uid } = useParams<{ uid: string }>();
  const nav = useNavigate();
  const { data, isLoading } = useSuperUserDetail(uid);
  const disable = useSuperDisableUser();
  const enable = useSuperEnableUser();
  const promote = useSuperPromoteUser();
  const forceReset = useSuperForcePasswordReset();
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  if (isLoading || !data) {
    return (
      <Screen className="dark">
        <AppBar back title="User" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const u = data.user;
  const disabled = u.status === 'disabled';

  async function doForceReset(): Promise<void> {
    try {
      await forceReset.mutateAsync(uid as string);
      setToast('Password-reset email sent.');
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setToast(extractError(err).message);
      setTimeout(() => setToast(null), 2200);
    }
  }

  return (
    <Screen className="dark">
      <AppBar
        back
        title="User"
        trailing={
          <button className="ic-btn" aria-label="More">
            <Icon name="more_vert" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6">
        {/* Centred avatar block — design #78 */}
        <div className="flex flex-col items-center text-center" style={{ marginBottom: 16 }}>
          <Avatar name={u.name} size={72} />
          <div className="t-title-lg" style={{ margin: '12px 0 2px' }}>{u.name}</div>
          <div className="t-body-md" style={{ margin: 0 }} dir="ltr">{u.email}</div>
          <div className="t-body-md" style={{ margin: '2px 0 0', fontSize: 11 }}>
            User since {fmtMonthYear(u.createdAt)} · ID {shortId(u.id)}
          </div>
          {u.globalRole === 'superadmin' && (
            <span className="role-badge rb-super" style={{ marginTop: 10 }}>
              <span className="msr">verified_user</span>
              Super Admin
            </span>
          )}
        </div>

        {u.bio && (
          <p className="t-body-md" style={{ marginBottom: 16 }}>{u.bio}</p>
        )}

        {/* Communities · N */}
        <div className="t-label-sm" style={{ marginBottom: 6 }}>
          Communities · {data.memberships.length}
        </div>
        {data.memberships.length === 0 && (
          <div
            className="t-body-md p-3"
            style={{ background: 'rgb(var(--surface-2))', borderRadius: 12 }}
          >
            This user isn't a member of any community.
          </div>
        )}
        <div className="flex flex-col">
          {data.memberships.map((m) => {
            const role = ROLE_BADGE[m.role] ?? ROLE_BADGE.member;
            return (
              <button
                key={m.membershipId}
                onClick={() => m.community && nav(`/super/communities/${m.community.id}`)}
                className="list-row flex items-center gap-3 text-start"
              >
                <span
                  className="grid place-items-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgb(var(--brand))',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="hub" size={15} />
                </span>
                <div className="flex-1 min-w-0 t-label-lg truncate" style={{ fontSize: 13.5 }}>
                  {m.community?.name ?? 'Community'}
                </div>
                <span className={role.className} style={{ height: 18, fontSize: 10 }}>
                  {role.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Account actions */}
        <div className="t-label-sm" style={{ margin: '16px 0 8px', color: 'rgb(var(--error))' }}>
          Account actions
        </div>
        <Card style={{ padding: '4px 14px' }}>
          <button
            onClick={doForceReset}
            disabled={forceReset.isPending}
            className="list-row flex items-center gap-3 text-start w-full"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="lock_reset" className="text-muted" />
            <span className="flex-1 t-body-lg" style={{ fontSize: 14 }}>
              Force password reset
            </span>
            <Icon name="chevron_right" className="text-muted" />
          </button>
          {disabled ? (
            <button
              onClick={() => uid && enable.mutate(uid)}
              disabled={enable.isPending}
              className="list-row flex items-center gap-3 text-start w-full"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: 'none' }}
            >
              <Icon name="check_circle" style={{ color: 'rgb(var(--success))' }} />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14, color: 'rgb(var(--success))' }}>
                Enable account
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </button>
          ) : (
            <button
              onClick={() => setConfirmDisable(true)}
              className="list-row flex items-center gap-3 text-start w-full"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: 'none' }}
            >
              <Icon name="block" style={{ color: 'rgb(var(--error))' }} />
              <span className="flex-1 t-body-lg" style={{ fontSize: 14, color: 'rgb(var(--error))' }}>
                Disable account
              </span>
              <Icon name="chevron_right" className="text-muted" />
            </button>
          )}
        </Card>

        {confirmDisable && !disabled && (
          <Card
            className="p-3"
            style={{
              background: 'rgb(var(--error-wash))',
              border: '1px solid rgb(var(--error))',
              marginTop: 12,
            }}
          >
            <div className="t-label-lg mb-2">Disable this account?</div>
            <div className="t-body-md mb-3">
              {u.name} will be signed out and blocked from signing in. You can re-enable any time.
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <AppButton variant="secondary" onClick={() => setConfirmDisable(false)}>
                Cancel
              </AppButton>
              <AppButton
                variant="danger"
                onClick={async () => {
                  if (uid) await disable.mutateAsync(uid);
                  setConfirmDisable(false);
                }}
                loading={disable.isPending}
              >
                Disable
              </AppButton>
            </div>
          </Card>
        )}

        {u.globalRole !== 'superadmin' && (
          <div style={{ marginTop: 16 }}>
            <AppButton
              variant="secondary"
              onClick={() => uid && promote.mutate(uid)}
              loading={promote.isPending}
            >
              <Icon name="workspace_premium" size={18} />
              Promote to super admin
            </AppButton>
          </div>
        )}

        {toast && (
          <div
            className="t-body-md mt-4 p-3 text-center"
            style={{
              background: 'rgb(var(--surface-2))',
              borderRadius: 12,
              color: 'rgb(var(--on-bg))',
            }}
          >
            {toast}
          </div>
        )}
      </main>
    </Screen>
  );
}
