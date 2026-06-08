import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { useCommentOnPost, usePost, usePostComments } from '../../lib/queries';

export function PostDetailScreen() {
  const { pid } = useParams<{ pid: string }>();
  const { data: post } = usePost(pid);
  const { data: comments } = usePostComments(pid);
  const post_comment = useCommentOnPost(pid);
  const [draft, setDraft] = useState('');

  function submit(): void {
    const t = draft.trim();
    if (!t) return;
    post_comment.mutate(t, { onSuccess: () => setDraft('') });
  }

  if (!post) {
    return (
      <Screen>
        <AppBar back />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Post" />
      <main className="flex-1 px-5 pb-2 overflow-y-auto">
        <Card className="p-3.5">
          <div className="mb-2.5 flex items-center gap-2.5">
            <Avatar name={post.author.name} size={40} />
            <div>
              <div className="t-label-lg">{post.author.name}</div>
              <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                {new Date(post.createdAt).toLocaleString(undefined)}
              </div>
            </div>
          </div>
          <p className="t-body-lg" style={{ margin: 0 }}>
            {post.body}
          </p>
        </Card>

        <div className="t-label-sm mb-2 mt-5">Comments · {comments?.length ?? 0}</div>
        <div className="space-y-3">
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar name={c.author.name} size={32} />
              <div className="flex-1">
                <div className="t-label-lg" style={{ fontSize: 12.5 }}>
                  {c.author.name}
                </div>
                <div className="t-body-md" style={{ color: 'rgb(var(--on-bg))' }}>
                  {c.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <div
          className="control flex items-center gap-2.5"
          style={{
            height: 46,
            padding: '0 14px',
            background: 'rgb(var(--surface-2))',
            border: '1.5px solid rgb(var(--border-2))',
            borderRadius: 999,
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Write a comment…"
            className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || post_comment.isPending}
            className="ic-btn"
            style={{ background: 'rgb(var(--brand))', color: '#fff', width: 34, height: 34 }}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </footer>
    </Screen>
  );
}
