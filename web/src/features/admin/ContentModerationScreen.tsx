import { useMemo, useState } from 'react';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { Pill } from '../../components/Pill';
import { communityContext } from '../../lib/community-context';
import {
  useModerationQueue,
  useModeratePost,
  useMyCommunities,
  type ModerationPost,
} from '../../lib/queries';

type Filter = 'all' | 'visible' | 'hidden';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  visible: 'Visible',
  hidden: 'Hidden',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ContentModerationScreen() {
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useModerationQueue(cid);
  const moderate = useModeratePost(cid);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered: ModerationPost[] = useMemo(
    () =>
      (data ?? []).filter((p) => {
        if (filter === 'visible') return !p.hidden;
        if (filter === 'hidden') return p.hidden;
        return true;
      }),
    [data, filter],
  );

  const count = filtered.length;

  return (
    <Screen>
      <AppBar back title={isLoading ? 'Moderation' : `Moderation · ${count}`} />
      <main className="flex-1 px-5 pb-6 content-wide lg:px-8">
        <div className="flex gap-2 mb-3">
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
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingDots />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="verified_user"
            title="Nothing to review"
            body="All content looks healthy"
          />
        )}

        <div className="space-y-2.5">
          {filtered.map((p) => (
            <div key={p.id} className="card p-3.5">
              <div className="row mb-2.5 flex items-center gap-2 flex-wrap">
                <Pill tone={p.hidden ? 'bad' : 'ok'}>
                  <Icon name={p.hidden ? 'visibility_off' : 'visibility'} size={11} />
                  {p.hidden ? 'Hidden' : 'Visible'}
                </Pill>
                <span
                  className="t-body-md"
                  style={{ margin: 0, fontSize: 11, color: 'rgb(var(--muted))' }}
                >
                  {p.type === 'comment' ? 'Comment' : 'Post'} · {formatDate(p.createdAt)}
                </span>
              </div>

              {/* Author + body quote — design unit 56 surface-2 inset card. */}
              <div
                className="mb-3"
                style={{
                  background: 'rgb(var(--surface-2))',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div className="row mb-1.5 flex items-center gap-2">
                  <Avatar
                    name={p.author?.name ?? 'Anon'}
                    src={p.author?.photoUrl ?? undefined}
                    size={24}
                  />
                  <span className="t-label-lg" style={{ fontSize: 12 }}>
                    {p.author?.name ?? 'Anonymous'}
                  </span>
                </div>
                {p.title && (
                  <div className="t-label-lg mb-1" style={{ fontSize: 12 }}>
                    {p.title}
                  </div>
                )}
                <div
                  className="t-body-md"
                  style={{ margin: 0, color: 'rgb(var(--on-bg))' }}
                >
                  {p.body.length > 220 ? `${p.body.slice(0, 220)}…` : p.body}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => moderate.mutate({ pid: p.id, action: 'keep' })}
                  disabled={moderate.isPending}
                >
                  <Icon name="check" size={14} />
                  Keep
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => moderate.mutate({ pid: p.id, action: 'warn' })}
                  disabled={moderate.isPending}
                >
                  <Icon name="warning" size={14} />
                  Warn
                </AppButton>
                <AppButton
                  variant="danger"
                  size="sm"
                  onClick={() => moderate.mutate({ pid: p.id, action: 'remove' })}
                  disabled={moderate.isPending}
                >
                  <Icon name="delete" size={14} />
                  Remove
                </AppButton>
              </div>
            </div>
          ))}
        </div>
      </main>
    </Screen>
  );
}
