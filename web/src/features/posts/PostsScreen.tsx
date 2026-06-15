import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { Shimmer } from '../../components/Shimmer';
import { useCommunityPosts, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function PostsScreen() {
  const nav = useNavigate();
  const { data: mine } = useMyCommunities();
  const ctx = communityContext();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data: posts, isLoading } = useCommunityPosts(cid);

  return (
    <>
      <AppBar title="Posts" />
      <main className="px-5 pb-6 content-md lg:px-8">
        {isLoading && (
          <div className="space-y-3">
            <Shimmer style={{ height: 120 }} />
            <Shimmer style={{ height: 120 }} />
          </div>
        )}

        {!isLoading && (!posts || posts.length === 0) && (
          <EmptyState
            icon="forum"
            title="No posts yet"
            body="Posts from admins and members will appear here."
          />
        )}

        <div className="space-y-3">
          {posts?.map((p) => (
            <Card key={p.id} className="p-3.5" onClick={() => nav(`/posts/${p.id}`)}>
              <div className="row mb-2.5 flex items-center gap-2.5">
                <Avatar name={p.author.name} size={32} />
                <div className="flex-1">
                  <div className="t-label-lg">{p.author.name}</div>
                  <div className="t-body-md" style={{ margin: 0, fontSize: 12 }}>
                    {fmtAgo(p.createdAt)}
                  </div>
                </div>
                {p.pinned && (
                  <Pill tone="brand">
                    <Icon name="push_pin" size={11} />
                    Pinned
                  </Pill>
                )}
              </div>
              <p className="t-body-lg" style={{ margin: 0 }}>
                {p.body}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Icon name="favorite" size={17} />
                  {p.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="mode_comment" size={17} />
                  {p.commentCount}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
