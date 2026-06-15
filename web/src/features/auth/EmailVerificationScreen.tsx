import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { OtpInput } from '../../components/OtpInput';
import { Icon } from '../../components/Icon';
import { t } from '../../i18n';
import { useResendVerification, useVerifyEmail } from '../../lib/queries';

export function EmailVerificationScreen() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [resend, setResend] = useState(42);
  const verifyMut = useVerifyEmail();
  const resendMut = useResendVerification();

  useEffect(() => {
    if (resend <= 0) return;
    const id = setInterval(() => setResend((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [resend]);

  async function verify(): Promise<void> {
    if (!email || code.length !== 6) {
      setError(true);
      return;
    }
    setError(false);
    try {
      await verifyMut.mutateAsync({ email, code });
      nav('/onboard/profile', { replace: true });
    } catch {
      setError(true);
    }
  }

  async function handleResend(): Promise<void> {
    if (!email || resend > 0) return;
    try {
      await resendMut.mutateAsync(email);
    } catch {
      // resend is best-effort — server never leaks state
    }
    setResend(42);
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center content-sm lg:px-8">
        <div className="blob mt-5">
          <Icon name="mark_email_unread" size={44} />
        </div>
        <h1 className="t-display-md mb-2 mt-5">{t.auth.verifyTitle}</h1>
        <p className="t-body-lg mb-7" style={{ color: 'rgb(var(--muted))' }}>
          {t.auth.verifyBody(email || '')}
        </p>
        <OtpInput value={code} onChange={setCode} onComplete={verify} error={error} />
        <AppButton loading={verifyMut.isPending} onClick={verify} className="mt-7">
          {t.auth.verify}
        </AppButton>
        <p className="t-body-md mt-4">
          Didn't get it?{' '}
          {resend > 0 ? (
            <b style={{ color: 'rgb(var(--brand-ink))' }}>
              Resend in 0:{resend.toString().padStart(2, '0')}
            </b>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendMut.isPending}
              style={{ color: 'rgb(var(--brand-ink))', fontWeight: 700 }}
            >
              Resend now
            </button>
          )}
        </p>
      </main>
    </Screen>
  );
}
