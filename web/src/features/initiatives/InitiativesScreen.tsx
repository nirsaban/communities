import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Chip, Pill, StatusChip } from '../../components/Pill';
import { Shimmer } from '../../components/Shimmer';
import { useCommunityInitiatives, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';

export function InitiativesScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const { data, isLoading } = useCommunityInitiatives(cid);
  const [filter, setFilter] = useState<'trending' | 'new' | 'active' | 'completed'>('trending');

  const filtered = (data ?? []).filter((i) => {
    if (filter === 'active') return i.status === 'active';
    if (filter === 'completed') return i.status === 'completed';
    return true;
  });

  return (
    <>
      <AppBar title="Initiatives" />
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            { id: 'trending', label: '🔥 Trending' },
            { id: 'new', label: 'New' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
          ].map((f) => (
            <Chip
              key={f.id}
              selected={filter === f.id}
              onClick={() => setFilter(f.id as typeof filter)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>
      <main className="px-5 pb-6">
        {isLoading && (
          <div className="space-y-3">
            <Shimmer style={{ height: 140 }} />
            <Shimmer style={{ height: 140 }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="lightbulb"
            title="No initiatives yet"
            body="Propose the first one for your community."
          />
        )}

        <div className="space-y-3">
          {filtered.map((it) => (
            <Card key={it.id} className="p-3.5" onClick={() => nav(`/initiatives/${it.id}`)}>
              <div className="mb-2 flex items-center justify-between">
                {it.category && <Pill tone="neutral">🌱 {it.category}</Pill>}
                <StatusChip
                  status={it.status === 'active' ? 'pub' : it.status === 'completed' ? 'done' : 'draft'}
                  label={
                    it.status === 'active' ? 'Active' : it.status === 'completed' ? 'Completed' : 'Draft'
                  }
                />
              </div>
              <div className="t-title-md mb-1">{it.title}</div>
              <p className="t-body-md mb-3" style={{ margin: 0 }}>
                {it.description.slice(0, 100)}
                {it.description.length > 100 ? '…' : ''}
              </p>
              {it.goal && it.goal > 0 && (
                <>
                  <div className="progress-track mb-2">
                    <span style={{ width: `${Math.min(100, ((it.progress ?? it.supporterCount) / it.goal) * 100)}%` }} />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={it.author.name} size={32} />
                  <span className="t-body-md" style={{ margin: 0 }}>
                    {it.supporterCount} supporters
                  </span>
                </div>
                {it.goal && (
                  <span className="t-label-sm" style={{ margin: 0, color: 'rgb(var(--brand-ink))' }}>
                    {Math.round(((it.progress ?? it.supporterCount) / it.goal) * 100)}%
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
