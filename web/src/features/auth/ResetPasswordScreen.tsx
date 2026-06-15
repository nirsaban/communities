import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, extractError } from '../../lib/api';
import { AppBar, Screen } from '../../components/AppBar';
import { PasswordInput } from '../../components/Input';
import { AppButton } from '../../components/AppButton';
import { t } from '../../i18n';

function strength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ['Very weak', 'Weak', 'Medium — add a symbol', 'Strong', 'Very strong'];
  const color = s >= 3 ? 'rgb(var(--success))' : s >= 2 ? 'rgb(var(--warning))' : 'rgb(var(--error))';
  return { score: s, label: labels[s], color };
}

export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const str = useMemo(() => strength(password), [password]);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t.auth.passwordsMismatch);
      return;
    }
    if (str.score < 2) {
      setError(t.auth.passwordWeak);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      nav('/login', { replace: true });
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppBar back showTitle={false} />
      <main className="flex-1 px-5 pb-10 content-sm lg:px-8">
        <h1 className="t-display-md mb-2">Choose a new password</h1>
        <p className="t-body-lg mb-6" style={{ color: 'rgb(var(--muted))' }}>
          {t.auth.passwordHelper}
        </p>
        <form onSubmit={onSubmit} noValidate>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>{t.auth.newPassword}</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} leadingIcon="lock" required dir="ltr" />
            {password.length > 0 && (
              <>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        height: 4,
                        flex: 1,
                        borderRadius: 9,
                        background: i < str.score ? str.color : 'rgb(var(--border-2))',
                      }}
                    />
                  ))}
                </div>
                <div className="hint" style={{ color: str.color }}>
                  {str.label}
                </div>
              </>
            )}
          </div>
          <PasswordInput
            label={t.auth.confirmPassword}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            leadingIcon="lock"
            error={mismatch ? t.auth.passwordsMismatch : undefined}
            required
            dir="ltr"
          />
          {error && <div className="mb-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>}
          <AppButton type="submit" loading={loading} className="mt-1.5">
            {t.auth.updatePassword}
          </AppButton>
        </form>
      </main>
    </Screen>
  );
}
