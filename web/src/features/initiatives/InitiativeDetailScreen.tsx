import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Pill, StatusChip } from '../../components/Pill';
import { LoadingDots } from '../../components/LoadingDots';
import {
  useCommentOnInitiative,
  useInitiative,
  useInitiativeComments,
  useSupportInitiative,
} from '../../lib/queries';

export function InitiativeDetailScreen() {
  const { iid } = useParams<{ iid: string }>();
  const nav = useNavigate();
  const { data: it } = useInitiative(iid);
  const { data: comments } = useInitiativeComments(iid);
  const support = useSupportInitiative();
  const addComment = useCommentOnInitiative(iid);
  const [draft, setDraft] = useState('');

  if (!it) {
    return (
      <Screen>
        <AppBar back />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  function submit(): void {
    const t = draft.trim();
    if (!t) return;
    addComment.mutate(t, { onSuccess: () => setDraft('') });
  }

  return (
    <Screen>
      <div
        className="imgph"
        style={{
          position: 'absolute',
          inset: '0 0 auto',
          height: 200,
          borderRadius: 0,
          backgroundColor: '#26301f',
        }}
      />
      <div className="relative z-10 flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => nav(-1)}
          className="ic-btn"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        >
          <Icon name="arrow_back" />
        </button>
        <span className="flex-1" />
        <button className="ic-btn" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
          <Icon name="ios_share" />
        </button>
      </div>
      <main className="relative flex-1 overflow-y-auto pb-32">
        <div style={{ height: 100 }} />
        <div
          style={{
            background: 'rgb(var(--bg))',
            borderRadius: '22px 22px 0 0',
            padding: '22px 20px',
            minHeight: 420,
          }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            {it.category && <Pill tone="neutral">🌱 {it.category}</Pill>}
            <StatusChip
              status={it.status === 'active' ? 'pub' : it.status === 'completed' ? 'done' : 'draft'}
              label={
                it.status === 'active' ? 'Active' : it.status === 'completed' ? 'Completed' : 'Draft'
              }
            />
          </div>
          <h1 className="t-display-md mb-3">{it.title}</h1>
          <div className="mb-4 flex items-center gap-2.5">
            <Avatar name={it.author.name} size={32} />
            <div>
              <div className="t-label-lg" style={{ fontSize: 12.5 }}>
                Started by {it.author.name}
              </div>
              <div className="t-body-md" style={{ margin: 0 }}>
                {new Date(it.createdAt).toLocaleDateString(undefined)}
              </div>
            </div>
          </div>
          <p className="t-body-lg mb-4">{it.description}</p>

          <Card className="p-3.5">
            {it.goal && (
              <p
                className="t-body-md"
                style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  color: 'rgb(var(--brand-ink))',
                }}
              >
                <Icon name="flag" size={13} /> {it.goal}
              </p>
            )}
            <div className="mb-2 flex items-center justify-between">
              <span className="t-label-lg">
                {it.supporterCount} supporters
                {it.membersNeeded ? ` · ${it.membersNeeded} needed` : ''}
              </span>
              {it.membersNeeded && it.membersNeeded > 0 && (
                <span
                  className="t-label-sm"
                  style={{ margin: 0, color: 'rgb(var(--brand-ink))' }}
                >
                  {Math.round((it.supporterCount / it.membersNeeded) * 100)}%
                </span>
              )}
            </div>
            {it.membersNeeded && it.membersNeeded > 0 && (
              <div className="progress-track">
                <span
                  style={{
                    width: `${Math.min(100, (it.supporterCount / it.membersNeeded) * 100)}%`,
                  }}
                />
              </div>
            )}
          </Card>

          <div className="t-label-sm mb-2.5 mt-5">Comments · {comments?.length ?? 0}</div>
          <div className="space-y-3">
            {comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar name={c.author.name} size={32} />
                <div className="flex-1">
                  <span className="t-label-lg" style={{ fontSize: 12.5 }}>
                    {c.author.name}
                  </span>
                  <div className="t-body-md" style={{ color: 'rgb(var(--on-bg))' }}>
                    {c.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Write a comment…"
              className="grow rounded-md border border-border2 bg-surface px-3 text-sm"
              style={{ height: 40 }}
            />
            <button
              onClick={submit}
              className="ic-btn"
              style={{ background: 'rgb(var(--brand))', color: '#fff' }}
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </main>
      <footer
        className="safe-bottom flex gap-2.5 px-5 py-3"
        style={{ background: 'rgb(var(--surface))', borderTop: '1px solid rgb(var(--border))' }}
      >
        <AppButton
          loading={support.isPending}
          onClick={() => iid && support.mutate({ iid, support: !it.iSupport })}
        >
          <span className="msr">favorite</span>
          {it.iSupport ? 'Remove support' : 'Support'}
        </AppButton>
      </footer>
    </Screen>
  );
}
