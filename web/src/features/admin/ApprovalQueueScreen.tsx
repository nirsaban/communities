import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { communityContext } from '../../lib/community-context';
import {
  useApproveMember,
  useMyCommunities,
  usePendingMembers,
  useRejectMember,
} from '../../lib/queries';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `Applied ${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Applied ${hr}h ago`;
  return `Applied ${Math.round(hr / 24)}d ago`;
}

export function ApprovalQueueScreen() {
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = usePendingMembers(cid);
  const approve = useApproveMember(cid);
  const reject = useRejectMember(cid);

  const count = data?.length ?? 0;

  return (
    <Screen>
      <AppBar
        back
        title={isLoading ? 'Applications' : `Applications · ${count}`}
      />
      <main className="flex-1 px-5 pb-6">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <EmptyState icon="task_alt" title="No pending requests" body="You're all caught up" />
        )}

        <div className="space-y-3">
          {data?.map((m) => (
            <div key={m.membershipId} className="card p-3.5">
              <div className="flex items-center gap-3 mb-2.5">
                <Avatar name={m.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="t-label-lg truncate">{m.name}</div>
                  <div
                    className="t-body-md truncate"
                    style={{ margin: 0, fontSize: 11, color: 'rgb(var(--muted))' }}
                  >
                    {timeAgo(m.requestedAt)}
                  </div>
                </div>
              </div>

              {m.bio && (
                <div
                  className="mb-3"
                  style={{
                    background: 'rgb(var(--surface-2))',
                    borderRadius: 10,
                    padding: 11,
                  }}
                >
                  <div className="t-label-sm" style={{ marginBottom: 4 }}>
                    Why do you want to join?
                  </div>
                  <div className="t-body-md" style={{ margin: 0, color: 'rgb(var(--on-bg))' }}>
                    {m.bio}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => reject.mutate(m.userId)}
                  disabled={reject.isPending || approve.isPending}
                >
                  <Icon name="close" size={16} />
                  Reject
                </AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => approve.mutate(m.userId)}
                  disabled={reject.isPending || approve.isPending}
                >
                  <Icon name="check" size={16} />
                  Approve
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Screen>
  );
}
