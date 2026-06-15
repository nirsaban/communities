import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { StatusChip } from '../../components/Pill';
import { communityContext } from '../../lib/community-context';
import {
  useApproveInitiative,
  useCommunityInitiatives,
  useMyCommunities,
  useRejectInitiative,
} from '../../lib/queries';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  community: '🌱',
  education: '📚',
  service: '🤝',
  other: '📣',
};

export function InitiativeModerationScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useCommunityInitiatives(cid);
  const approve = useApproveInitiative();
  const reject = useRejectInitiative();

  const pending = useMemo(
    () => (data ?? []).filter((i) => i.status === 'submitted' || i.status === 'draft'),
    [data],
  );

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function startReject(id: string): void {
    setRejectId(id);
    setRejectReason('');
  }
  function cancelReject(): void {
    setRejectId(null);
    setRejectReason('');
  }
  async function sendReject(iid: string): Promise<void> {
    await reject.mutateAsync({ iid, reason: rejectReason.trim() || undefined });
    cancelReject();
  }

  return (
    <Screen>
      <AppBar
        back
        title={isLoading ? 'Initiatives' : `Initiatives · ${pending.length} pending`}
      />
      <main className="flex-1 px-5 pb-6 content-wide lg:px-8">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!isLoading && pending.length === 0 && (
          <EmptyState
            icon="lightbulb"
            title="No pending initiatives"
            body="Everything's been reviewed"
          />
        )}

        <div className="space-y-3">
          {pending.map((i) => {
            const isRejecting = rejectId === i.id;
            const catKey = (i.category ?? '').toLowerCase();
            const emoji = CATEGORY_EMOJI[catKey] ?? '📣';
            const catLabel = i.category ?? 'Other';
            return (
              <div
                key={i.id}
                className="card p-3.5"
                style={isRejecting ? { borderColor: 'rgb(var(--error))' } : undefined}
              >
                <div className="row mb-2 flex items-center justify-between" style={{ gap: 8 }}>
                  <span
                    className="chip"
                    style={{
                      height: 24,
                      fontSize: 11,
                      background: 'rgb(var(--surface-2))',
                      color: 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                    }}
                  >
                    {emoji} {catLabel}
                  </span>
                  <StatusChip
                    status={isRejecting ? 'cancel' : 'draft'}
                    label={isRejecting ? 'Rejecting' : 'Pending'}
                  />
                </div>

                <button
                  onClick={() => nav(`/initiatives/${i.id}`)}
                  className="t-title-md block text-start w-full mb-2"
                >
                  {i.title}
                </button>

                <div className="row mb-3 flex items-center gap-2">
                  <Avatar name={i.author.name} size={28} />
                  <span
                    className="t-body-md"
                    style={{ margin: 0, fontSize: 12, color: 'rgb(var(--muted))' }}
                  >
                    By {i.author.name} · {timeAgo(i.createdAt)}
                  </span>
                </div>

                {!isRejecting && (
                  <div className="t-body-md mb-3" style={{ margin: 0 }}>
                    {i.description.length > 200
                      ? `${i.description.slice(0, 200)}…`
                      : i.description}
                  </div>
                )}

                {isRejecting ? (
                  <div className="field" style={{ margin: 0 }}>
                    <label>Reason for rejection</label>
                    <div
                      className="control"
                      style={{ height: 'auto', alignItems: 'flex-start', padding: 12 }}
                    >
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Share why this can't be approved — sent to the author."
                        className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                      <AppButton variant="secondary" size="sm" onClick={cancelReject}>
                        Cancel
                      </AppButton>
                      <AppButton
                        variant="danger"
                        size="sm"
                        onClick={() => sendReject(i.id)}
                        loading={reject.isPending}
                      >
                        Send rejection
                      </AppButton>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <AppButton
                      variant="secondary"
                      size="sm"
                      onClick={() => startReject(i.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <Icon name="close" size={14} />
                      Reject
                    </AppButton>
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => approve.mutate(i.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <Icon name="check" size={14} />
                      Approve
                    </AppButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}
