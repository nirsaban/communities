import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { AppBar, Screen } from '../../components/AppBar';
import { Input } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { t } from '../../i18n';

export function ForgotPasswordScreen() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function onSubmit(e?: React.FormEvent): Promise<void> {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      setCooldown(60);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className="flex flex-1 flex-col px-5 pb-10 content-sm lg:px-8">
        <div className="blob mb-5">
          <Icon name="lock_reset" size={44} />
        </div>
        <h1 className="t-display-md mb-2">{sent ? t.auth.resetSentTitle : t.auth.forgotTitle}</h1>
        <p className="t-body-lg mb-6" style={{ color: 'rgb(var(--muted))' }}>
          {sent ? t.auth.resetSentBody : t.auth.forgotBody}
        </p>
        {!sent && (
          <form onSubmit={onSubmit} noValidate>
            <Input
              label={t.auth.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leadingIcon="mail"
              required
              dir="ltr"
            />
            {error && <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>}
            <AppButton type="submit" loading={loading} className="mt-1.5">
              {t.auth.sendReset}
            </AppButton>
            <AppButton variant="ghost" type="button" onClick={() => nav('/login')} className="mt-2.5">
              {t.auth.backToLogin}
            </AppButton>
          </form>
        )}
        {sent && (
          <>
            <AppButton variant="secondary" disabled={cooldown > 0} onClick={() => onSubmit()}>
              {cooldown > 0 ? `${t.auth.resendIn} ${cooldown}s` : t.auth.sendReset}
            </AppButton>
            <AppButton variant="ghost" onClick={() => nav('/login')} className="mt-2.5">
              {t.auth.backToLogin}
            </AppButton>
          </>
        )}
      </main>
    </Screen>
  );
}
