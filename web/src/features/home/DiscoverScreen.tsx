import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar } from '../../components/AppBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { Shimmer } from '../../components/Shimmer';
import { AppButton } from '../../components/AppButton';
import { useToast } from '../../components/Toast';
import { useDiscoverCommunities, useJoinCommunity, useRequestJoin } from '../../lib/queries';
import { extractError } from '../../lib/api';
import { t } from '../../i18n';

export function DiscoverScreen() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useDiscoverCommunities(q || undefined);
  const join = useJoinCommunity();
  const request = useRequestJoin();
  const nav = useNavigate();
  const toast = useToast();

  function handleAction(community: { id: string; name: string; privacy: string }): void {
    const isPublic = community.privacy === 'public';
    const m = isPublic ? join : request;
    m.mutate(community.id, {
      onSuccess: () => {
        if (isPublic) {
          toast.success(`Joined ${community.name}`);
          nav(`/c/${community.id}/welcome`);
        } else {
          toast.info(`Request sent to ${community.name} — waiting for admin approval`, 3200);
        }
      },
      onError: (err) => toast.error(extractError(err).message),
    });
  }

  return (
    <>
      <AppBar title={t.discover.title} />
      <main className="px-5 pb-6 content-wide lg:px-8">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.discover.search}
          leadingIcon="search"
        />

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="flex items-center gap-3 p-3">
                <Shimmer style={{ width: 56, height: 56, borderRadius: 11 }} />
                <div className="flex-1">
                  <Shimmer style={{ height: 14, width: '60%' }} />
                  <Shimmer style={{ height: 12, width: '80%', marginTop: 6 }} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {data && data.length === 0 && (
          <EmptyState icon="explore_off" title={t.discover.empty} />
        )}

        {data && data.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((c) => {
              const isPublic = c.privacy === 'public';
              const m = isPublic ? join : request;
              const pending = m.isPending && m.variables === c.id;
              return (
                <Card
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 p-3"
                  onClick={() => nav(`/c/${c.id}`)}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center text-brand-on"
                    style={{ borderRadius: 11, background: 'rgb(var(--brand))' }}
                  >
                    <Icon name="diversity_3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="t-title-md truncate">{c.name}</h3>
                    {c.description && (
                      <p className="t-body-md truncate" style={{ margin: 0 }}>
                        {c.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs" style={{ color: 'rgb(var(--muted))' }}>
                      {c.memberCount.toLocaleString()} {t.app.members}
                    </p>
                  </div>
                  <AppButton
                    variant="primary"
                    size="sm"
                    block={false}
                    loading={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(c);
                    }}
                  >
                    {isPublic ? t.discover.join : t.discover.request}
                  </AppButton>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
