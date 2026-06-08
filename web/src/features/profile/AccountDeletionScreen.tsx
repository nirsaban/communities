import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useDeleteMe, useMyCommunities } from '../../lib/queries';

export function AccountDeletionScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const del = useDeleteMe();
  const { data: mine } = useMyCommunities();
  const [confirm, setConfirm] = useState('');
  // The DELETE gate is case-sensitive in the design — uppercase only.
  const armed = confirm === 'DELETE';
  const communitiesCount = mine?.length ?? 0;

  async function go(): Promise<void> {
    await del.mutateAsync();
    auth.logout();
    nav('/login', { replace: true });
  }

  return (
    <Screen>
      <AppBar back title="Delete account" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <div
          className="blob"
          style={{
            background: 'rgb(var(--error-wash))',
            color: 'rgb(var(--error))',
            margin: '10px 0 18px',
          }}
        >
          <Icon name="warning" size={42} />
        </div>
        <h1 className="t-display-md" style={{ margin: '0 0 10px' }}>
          Delete your account?
        </h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))', margin: '0 0 18px' }}>
          This is permanent. Once it's done, we can't bring it back.
        </p>

        <div className="flex flex-col gap-2.5" style={{ marginBottom: 20 }}>
          {[
            'Your profile & activity are erased',
            `You'll lose access to ${communitiesCount > 0 ? `all ${communitiesCount} communities` : 'your communities'}`,
            'Upcoming RSVPs are cancelled',
          ].map((line) => (
            <div key={line} className="flex items-center gap-2.5">
              <Icon name="close" size={20} style={{ color: 'rgb(var(--error))' }} />
              <span className="t-body-lg" style={{ fontSize: 14 }}>
                {line}
              </span>
            </div>
          ))}
        </div>

        <div className="field">
          <label>
            Type <b style={{ color: 'rgb(var(--error))' }}>DELETE</b> to confirm
          </label>
          <div
            className="control"
            style={{ borderColor: 'rgb(var(--error))' }}
          >
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              spellCheck={false}
              style={{ letterSpacing: '0.1em' }}
            />
          </div>
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-2.5">
          <AppButton variant="danger" disabled={!armed} loading={del.isPending} onClick={go}>
            Permanently delete account
          </AppButton>
          <AppButton variant="ghost" onClick={() => nav(-1)}>
            Keep my account
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
