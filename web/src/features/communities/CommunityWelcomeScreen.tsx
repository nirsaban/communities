import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { useCommunity } from '../../lib/queries';
import { t } from '../../i18n';

export function CommunityWelcomeScreen() {
  const { cid } = useParams<{ cid: string }>();
  const nav = useNavigate();
  const { data: community } = useCommunity(cid);

  return (
    <Screen>
      <AppBar showTitle={false} />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center content-sm lg:px-8">
        <div className="blob mt-4">
          <Icon name="celebration" size={44} />
        </div>
        <h1 className="t-display-md mb-2 mt-5">
          Welcome to<br />{community?.name ?? '…'}
        </h1>
        <p className="t-body-lg mb-2" style={{ color: 'rgb(var(--muted))' }}>
          {community?.description ?? t.community.welcomeBody}
        </p>

        <div className="mt-8 w-full space-y-3 text-start">
          {[
            { icon: 'forum', label: 'Active community discussions' },
            { icon: 'event_available', label: 'Events that matter to you' },
            { icon: 'group', label: 'Weekly member meetups' },
          ].map((row) => (
            <div
              key={row.label}
              className="card flex items-center gap-3 p-3"
            >
              <span
                className="flex h-10 w-10 items-center justify-center text-brand"
                style={{ borderRadius: 11, background: 'rgb(var(--brand-wash))' }}
              >
                <Icon name={row.icon} size={20} />
              </span>
              <span className="t-label-lg flex-1">{row.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto w-full pt-6">
          <AppButton onClick={() => cid && nav(`/c/${cid}/rules`)}>{t.app.continue}</AppButton>
        </div>
      </main>
    </Screen>
  );
}
