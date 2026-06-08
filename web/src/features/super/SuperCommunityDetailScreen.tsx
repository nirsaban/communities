import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { fmtCents } from '../../lib/format';
import { extractError } from '../../lib/api';
import {
  useSuperCommunityDetail,
  useSuperDeleteCommunity,
  useSuperRestoreCommunity,
  useSuperSuspendCommunity,
} from '../../lib/queries';

const CATEGORY_LABEL: Record<string, string> = {
  religious: 'Faith & study',
  educational: 'Education',
  professional: 'Maker & tech',
  hobby: 'Hobby & lifestyle',
  other: 'Other',
};

const SUSPEND_REASONS = [
  'Payment dispute',
  'Abuse / spam reports',
  'Policy violation',
  'Owner request',
  'Other',
];

function fmtMonthYear(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
}

// Design unit #76: typed-name + reason gate before suspend completes.
function SuspendConfirmCard({
  communityName,
  memberCount,
  onCancel,
  onConfirm,
  busy,
}: {
  communityName: string;
  memberCount: number;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);
  const matches = typed.trim().toLowerCase() === communityName.trim().toLowerCase();

  return (
    <div>
      <div
        className="blob"
        style={{
          background: 'rgb(var(--warning-wash))',
          color: 'rgb(var(--warning))',
          margin: '10px 0 16px',
        }}
      >
        <span className="msr" style={{ fontSize: 40 }}>pause_circle</span>
      </div>
      <h1 className="t-display-md" style={{ margin: '0 0 10px' }}>
        Suspend {communityName}?
      </h1>
      <p className="t-body-lg" style={{ margin: '0 0 16px', color: 'rgb(var(--muted))' }}>
        All {memberCount.toLocaleString()} members lose access immediately. Billing pauses. You can restore
        it at any time.
      </p>

      <div className="field">
        <label>
          Type <span className="kbd">{communityName}</span> to confirm
        </label>
        <div className="control" style={{ borderColor: 'rgb(var(--warning))' }}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={communityName}
            autoFocus
          />
        </div>
      </div>

      <div className="field">
        <label>
          Reason <span style={{ color: 'rgb(var(--muted))', fontWeight: 400 }}>· logged</span>
        </label>
        <div className="control" style={{ position: 'relative' }}>
          <Icon name="help" />
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="absolute inset-0 w-full h-full bg-transparent border-0 outline-none opacity-0 cursor-pointer"
            style={{ appearance: 'none' }}
          >
            {SUSPEND_REASONS.map((r) => (
              <option key={r} value={r} style={{ color: '#000' }}>
                {r}
              </option>
            ))}
          </select>
          <span className="flex-1 truncate" style={{ pointerEvents: 'none' }}>{reason}</span>
          <Icon name="expand_more" />
        </div>
      </div>

      <AppButton
        variant="warning"
        onClick={() => onConfirm(reason)}
        loading={busy}
        disabled={!matches || busy}
      >
        <Icon name="pause_circle" size={18} />
        Suspend community
      </AppButton>
      <div style={{ marginTop: 8 }}>
        <AppButton variant="ghost" onClick={onCancel}>
          Cancel
        </AppButton>
      </div>
    </div>
  );
}

export function SuperCommunityDetailScreen() {
  const { cid } = useParams<{ cid: string }>();
  const nav = useNavigate();
  const { data, isLoading } = useSuperCommunityDetail(cid);
  const suspend = useSuperSuspendCommunity();
  const restore = useSuperRestoreCommunity();
  const remove = useSuperDeleteCommunity();
  const [mode, setMode] = useState<'detail' | 'suspend' | 'delete'>('detail');
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <Screen className="dark">
        <AppBar back title="Community" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const name = String(data.name ?? '');
  const status = String(data.status ?? 'active') as 'active' | 'suspended' | 'deleted';
  const category = String(data.category ?? '');
  const description = typeof data.description === 'string' ? data.description : '';
  const createdAt = String(data.createdAt ?? '');
  const metrics = (data.metrics as { memberCount?: number; eventCount?: number; totalRevenueCents?: number }) ?? {};
  const memberCount = metrics.memberCount ?? 0;
  const eventCount = metrics.eventCount ?? 0;
  const totalRevenueCents = metrics.totalRevenueCents ?? 0;
  const owner = (data as { owner?: { id: string; name: string; email: string } }).owner ?? null;

  async function doSuspend(reason: string): Promise<void> {
    if (!cid) return;
    setError(null);
    try {
      await suspend.mutateAsync(cid);
      setMode('detail');
      // Telemetry-style log; surfaces via audit log.
      console.info('[super] suspend reason:', reason);
    } catch (err) {
      setError(extractError(err).message);
    }
  }
  async function doRestore(): Promise<void> {
    if (!cid) return;
    try {
      await restore.mutateAsync(cid);
    } catch (err) {
      setError(extractError(err).message);
    }
  }
  async function doDelete(): Promise<void> {
    if (!cid) return;
    try {
      await remove.mutateAsync(cid);
      nav('/super/communities');
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  // Unit #76 — typed-confirmation suspend.
  if (mode === 'suspend') {
    return (
      <Screen className="dark">
        <AppBar back title="Suspend community" onBack={() => setMode('detail')} />
        <main className="flex-1 px-5 pb-6">
          {error && (
            <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
              {error}
            </div>
          )}
          <SuspendConfirmCard
            communityName={name}
            memberCount={memberCount}
            onCancel={() => setMode('detail')}
            onConfirm={doSuspend}
            busy={suspend.isPending}
          />
        </main>
      </Screen>
    );
  }

  // Delete uses the same typed-confirmation pattern but destructive red.
  if (mode === 'delete') {
    return (
      <Screen className="dark">
        <AppBar back title="Delete community" onBack={() => setMode('detail')} />
        <main className="flex-1 px-5 pb-6">
          {error && (
            <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
              {error}
            </div>
          )}
          <DeleteConfirmCard
            communityName={name}
            memberCount={memberCount}
            onCancel={() => setMode('detail')}
            onConfirm={doDelete}
            busy={remove.isPending}
          />
        </main>
      </Screen>
    );
  }

  return (
    <Screen className="dark">
      <AppBar
        back
        title={name}
        trailing={
          <button className="ic-btn" aria-label="More">
            <Icon name="more_vert" />
          </button>
        }
      />
      <main className="flex-1 px-5 pb-6">
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {/* Header row — avatar + name + meta + status chip */}
        <div className="flex items-center gap-3" style={{ margin: '2px 0 16px' }}>
          <span
            className="grid place-items-center"
            style={{ width: 56, height: 56, borderRadius: 13, background: 'rgb(var(--brand))', color: '#fff' }}
          >
            <Icon name="hub" size={24} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="t-title-lg" style={{ fontSize: 18 }}>{name}</div>
            <div className="t-body-md" style={{ margin: 0 }}>
              {CATEGORY_LABEL[category] ?? category}
              {createdAt && ` · created ${fmtMonthYear(createdAt)}`}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {description && (
          <p className="t-body-md" style={{ margin: '0 0 16px' }}>{description}</p>
        )}

        {/* Vitals KPI grid */}
        <div className="grid grid-cols-2 gap-2.5" style={{ marginBottom: 11 }}>
          <Card className="kpi">
            <div className="k-lbl">Members</div>
            <div className="k-num">{memberCount.toLocaleString()}</div>
          </Card>
          <Card className="kpi">
            <div className="k-lbl">MRR</div>
            <div className="k-num">{fmtCents(totalRevenueCents)}</div>
          </Card>
          <Card className="kpi">
            <div className="k-lbl">Events</div>
            <div className="k-num">{eventCount.toLocaleString()}</div>
          </Card>
          <Card className="kpi">
            <div className="k-lbl">Plan</div>
            <div className="k-num" style={{ fontSize: 18, paddingTop: 6 }}>Standard</div>
          </Card>
        </div>

        {/* Owner */}
        {owner && (
          <>
            <div className="t-label-sm" style={{ margin: '14px 0 6px' }}>Owner</div>
            <div className="list-row">
              <span
                className="grid place-items-center text-on-brand"
                style={{ width: 36, height: 36, borderRadius: 11, background: 'rgb(var(--surface-2))', fontWeight: 600 }}
              >
                {owner.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="t-label-lg truncate">{owner.name}</div>
                <div className="t-body-md truncate" style={{ margin: 0, fontSize: 11 }} dir="ltr">
                  {owner.email}
                </div>
              </div>
              <span className="role-badge rb-admin" style={{ height: 19, fontSize: 10 }}>
                Admin
              </span>
            </div>
          </>
        )}

        {/* Platform actions */}
        <div className="t-label-sm" style={{ margin: '16px 0 8px', color: 'rgb(var(--error))' }}>
          Platform actions
        </div>
        {status === 'active' && (
          <div className="flex gap-2.5">
            <AppButton variant="secondary" onClick={() => setMode('suspend')} block={false}>
              <Icon name="pause_circle" size={18} />
              Suspend
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => setMode('delete')}
              block={false}
              style={{ color: 'rgb(var(--error))', borderColor: 'rgb(var(--error))' }}
            >
              <Icon name="delete_forever" size={18} />
              Delete
            </AppButton>
          </div>
        )}
        {status === 'suspended' && (
          <div className="space-y-2.5">
            <AppButton variant="primary" onClick={doRestore} loading={restore.isPending}>
              <Icon name="restart_alt" size={18} />
              Restore community
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => setMode('delete')}
              style={{ color: 'rgb(var(--error))', borderColor: 'rgb(var(--error))' }}
            >
              <Icon name="delete_forever" size={18} />
              Delete
            </AppButton>
          </div>
        )}
        {status === 'deleted' && (
          <Card className="p-4 text-center">
            <p className="t-body-md" style={{ margin: 0 }}>This community has been deleted.</p>
          </Card>
        )}
      </main>
    </Screen>
  );
}

function StatusBadge({ status }: { status: 'active' | 'suspended' | 'deleted' }) {
  if (status === 'active') return <span className="status-chip sc-pub" style={{ height: 19, fontSize: 10 }}>Active</span>;
  if (status === 'suspended') {
    return (
      <span
        className="status-chip sc-cancel"
        style={{ height: 19, fontSize: 10, background: 'rgb(var(--error-wash))', color: 'rgb(var(--error))' }}
      >
        Suspended
      </span>
    );
  }
  return <span className="status-chip sc-done" style={{ height: 19, fontSize: 10 }}>Deleted</span>;
}

function DeleteConfirmCard({
  communityName,
  memberCount,
  onCancel,
  onConfirm,
  busy,
}: {
  communityName: string;
  memberCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toLowerCase() === communityName.trim().toLowerCase();
  return (
    <div>
      <div
        className="blob"
        style={{
          background: 'rgb(var(--error-wash))',
          color: 'rgb(var(--error))',
          margin: '10px 0 16px',
        }}
      >
        <span className="msr" style={{ fontSize: 40 }}>delete_forever</span>
      </div>
      <h1 className="t-display-md" style={{ margin: '0 0 10px' }}>
        Delete {communityName}?
      </h1>
      <p className="t-body-lg" style={{ margin: '0 0 16px', color: 'rgb(var(--muted))' }}>
        All {memberCount.toLocaleString()} members lose access immediately. This can only be reversed by a
        manual database restore.
      </p>
      <div className="field">
        <label>
          Type <span className="kbd">{communityName}</span> to confirm
        </label>
        <div className="control" style={{ borderColor: 'rgb(var(--error))' }}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={communityName}
            autoFocus
          />
        </div>
      </div>
      <AppButton variant="danger" onClick={onConfirm} loading={busy} disabled={!matches || busy}>
        <Icon name="delete_forever" size={18} />
        Delete forever
      </AppButton>
      <div style={{ marginTop: 8 }}>
        <AppButton variant="ghost" onClick={onCancel}>Cancel</AppButton>
      </div>
    </div>
  );
}
