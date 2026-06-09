import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input, PasswordInput } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { landingPathAfterAuth } from '../../lib/role';

type Peek = {
  email: string;
  role: 'admin' | 'subadmin' | 'eventManager' | 'event_manager' | 'member';
  community: { id: string; name: string; logoUrl?: string };
  expiresAt: string;
  acceptedAt: string | null;
  isNewUser: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Community admin',
  subadmin: 'Sub-admin',
  event_manager: 'Event manager',
  eventManager: 'Event manager',
  member: 'Member',
};

export function InvitationAcceptScreen() {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();
  const auth = useAuth();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [peekError, setPeekError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/invitations/${token}`);
        if (!alive) return;
        setPeek(r.data?.data as Peek);
      } catch (err) {
        if (!alive) return;
        setPeekError(extractError(err).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  async function accept(): Promise<void> {
    if (!token || !peek) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {};
      if (peek.isNewUser) {
        if (!name.trim()) {
          setError('Please enter your name.');
          setSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters with a letter and a number.');
          setSubmitting(false);
          return;
        }
        body.name = name.trim();
        body.password = password;
      }
      const r = await api.post(`/invitations/${token}/accept`, body);
      const data = r.data?.data ?? {};
      // Anonymous accept returns tokens; logged-in accept returns null tokens
      // because the caller already has a session.
      if (data.tokens && data.user) {
        auth.loginSuccess(data.tokens.accessToken, data.tokens.refreshToken, data.user);
        const target = await landingPathAfterAuth(data.user);
        nav(target, { replace: true });
        return;
      }
      // Already-authenticated path: refresh /me/communities and land in the
      // role's home. For admins this is typically /admin (or /admin/wizard).
      if (auth.user) {
        const target = await landingPathAfterAuth(auth.user);
        nav(target, { replace: true });
      } else {
        nav('/login', { replace: true });
      }
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar showTitle={false} />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  if (peekError || !peek) {
    return (
      <Screen>
        <AppBar showTitle={false} />
        <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="blob mb-4" style={{ background: 'rgb(var(--error-wash))', color: 'rgb(var(--error))' }}>
            <Icon name="link_off" size={44} />
          </div>
          <h1 className="t-display-md mb-2">Invitation not found</h1>
          <p className="t-body-md mb-6 max-w-sm">
            This invite link is invalid or has expired. Ask the community admin to send a new one.
          </p>
          <AppButton variant="secondary" onClick={() => nav('/login')}>Back to sign in</AppButton>
        </main>
      </Screen>
    );
  }

  if (peek.acceptedAt) {
    return (
      <Screen>
        <AppBar showTitle={false} />
        <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="blob mb-4">
            <Icon name="check_circle" size={44} />
          </div>
          <h1 className="t-display-md mb-2">Already accepted</h1>
          <p className="t-body-md mb-6 max-w-sm">
            This invitation has already been used. Sign in to access {peek.community.name}.
          </p>
          <AppButton onClick={() => nav('/login')}>Sign in</AppButton>
        </main>
      </Screen>
    );
  }

  const expired = new Date(peek.expiresAt).getTime() < Date.now();
  if (expired) {
    return (
      <Screen>
        <AppBar showTitle={false} />
        <main className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="blob mb-4" style={{ background: 'rgb(var(--warning-wash))', color: 'rgb(var(--warning))' }}>
            <Icon name="hourglass_disabled" size={44} />
          </div>
          <h1 className="t-display-md mb-2">Invitation expired</h1>
          <p className="t-body-md mb-6 max-w-sm">
            Ask the community admin to send you a fresh invite.
          </p>
          <AppButton variant="secondary" onClick={() => nav('/login')}>Back to sign in</AppButton>
        </main>
      </Screen>
    );
  }

  const wrongAccount = auth.user && auth.user.email !== peek.email;

  return (
    <Screen>
      <AppBar showTitle={false} />
      <main className="flex flex-1 flex-col px-5 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <Avatar name={peek.community.name} src={peek.community.logoUrl} size={56} />
          <div>
            <div className="t-label-sm" style={{ margin: 0 }}>YOU'RE INVITED TO</div>
            <div className="t-title-lg" style={{ marginTop: 2 }}>{peek.community.name}</div>
          </div>
        </div>

        <Card className="p-4 mb-5">
          <div className="flex items-center gap-3">
            <Icon name="badge" size={20} className="text-brand" />
            <div className="flex-1">
              <div className="t-label-lg">{ROLE_LABEL[peek.role] ?? peek.role}</div>
              <div className="t-body-md" style={{ margin: 0 }}>
                Invited as <b>{peek.email}</b>
              </div>
            </div>
          </div>
        </Card>

        {wrongAccount && (
          <Card className="p-4 mb-5" style={{ background: 'rgb(var(--warning-wash))', borderColor: 'rgb(var(--warning))' }}>
            <div className="t-label-lg mb-1">Switch account</div>
            <p className="t-body-md" style={{ margin: 0 }}>
              You're signed in as {auth.user!.email}.{' '}
              {peek.isNewUser
                ? `Sign out to create the new account for ${peek.email}.`
                : `Sign out and sign back in as ${peek.email} to accept.`}
            </p>
            <AppButton
              variant="secondary"
              className="mt-3"
              onClick={() => {
                auth.logout();
                nav(`/invite/${token}`, { replace: true });
              }}
            >
              {peek.isNewUser ? 'Sign out & register' : 'Sign out'}
            </AppButton>
          </Card>
        )}

        {!wrongAccount && peek.isNewUser && (
          <>
            <h2 className="t-title-md mb-3">Create your account</h2>
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leadingIcon="person"
              autoComplete="name"
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon="lock"
              autoComplete="new-password"
              dir="ltr"
            />
            <div className="t-body-md mb-3" style={{ fontSize: 11 }}>
              At least 8 characters, with a letter and a number.
            </div>
          </>
        )}

        {!wrongAccount && !peek.isNewUser && !auth.user && (
          <>
            <p className="t-body-md mb-4">
              An account with this email already exists. Sign in to accept the invitation.
            </p>
            <AppButton
              variant="secondary"
              onClick={() => nav(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)}
            >
              Sign in to accept
            </AppButton>
          </>
        )}

        {error && (
          <div
            className="t-body-md mb-3 p-3 rounded-md"
            style={{ background: 'rgb(var(--error-wash))', color: 'rgb(var(--error))', margin: 0 }}
          >
            {error}
          </div>
        )}

        {!wrongAccount && (peek.isNewUser || auth.user) && (
          <div className="mt-auto pt-4">
            <AppButton onClick={accept} loading={submitting}>
              <Icon name="check" size={18} />
              Accept invitation
            </AppButton>
          </div>
        )}
      </main>
    </Screen>
  );
}
