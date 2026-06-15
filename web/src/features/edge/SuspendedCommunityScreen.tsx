import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';

type Props = {
  communityName?: string;
};

// Full-page lockout for the narrow case where the viewer has NO active
// membership context to render the banner against (e.g., an unauthenticated
// deep link or a soft-deleted membership). Authenticated, interactive
// surfaces now show the persistent SuspendedCommunity banner from RoleShell
// instead — see web/src/components/RoleShell.tsx.
export function SuspendedCommunityScreen({ communityName }: Props) {
  const nav = useNavigate();
  return (
    <Screen>
      <AppBar back title="Community paused" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center content-sm lg:px-8">
        <span
          className="grid place-items-center mb-4"
          style={{
            width: 104,
            height: 104,
            borderRadius: '50%',
            background: 'rgb(var(--warning-wash))',
            color: 'rgb(var(--warning))',
          }}
        >
          <Icon name="pause_circle" size={52} />
        </span>
        <h1 className="font-display text-3xl text-ink mb-2">This community is paused</h1>
        <p className="t-body-md max-w-xs mb-3" style={{ margin: 0 }}>
          {communityName ?? 'This community'} is temporarily unavailable. Your membership is safe — we'll restore access as soon as it's back.
        </p>
        <p className="t-body-md max-w-xs mb-6" style={{ margin: 0, fontSize: 12 }}>
          Questions? Reach out to a community admin or contact support.
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton variant="primary" onClick={() => nav('/discover')}>
          My other communities
        </AppButton>
      </footer>
    </Screen>
  );
}
