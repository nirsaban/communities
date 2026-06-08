import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { landingPathAfterAuth } from '../../lib/role';
import { t } from '../../i18n';

export function SplashScreen() {
  const nav = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 80));
      if (cancelled) return;
      const at = auth.accessToken;
      if (!at) {
        nav('/welcome', { replace: true });
        return;
      }
      try {
        const r = await api.get('/auth/me');
        const me = r.data?.data?.user;
        auth.setUser(me);
        const target = await landingPathAfterAuth(me);
        nav(target, { replace: true });
      } catch {
        // /auth/me failed even after the api interceptor's refresh attempt.
        // Wipe any stale persisted tokens so the next Protected route doesn't
        // gate on a phantom session.
        auth.logout();
        nav('/login', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dark relative flex min-h-full flex-col items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-5">
        {/* Two-circle logo with mix-blend-mode:difference, per Batch A */}
        <div className="relative h-[62px] w-[62px]">
          <span
            className="absolute"
            style={{ left: 0, top: 11, width: 40, height: 40, borderRadius: '50%', background: 'rgb(var(--brand))' }}
          />
          <span
            className="absolute"
            style={{
              right: 0,
              top: 11,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FAFAF7',
              mixBlendMode: 'difference',
            }}
          />
        </div>
        <div className="t-display-lg" style={{ fontSize: 33 }}>
          Commons
        </div>
      </div>
      <div className="absolute bottom-14 left-0 right-0 text-center">
        <div className="mb-4 flex justify-center gap-1.5">
          <span className="sk h-2 w-2 rounded-full" />
          <span className="sk h-2 w-2 rounded-full" style={{ animationDelay: '0.2s' }} />
          <span className="sk h-2 w-2 rounded-full" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="text-xs tracking-wider" style={{ color: 'rgb(var(--muted))' }}>
          {t.auth.splashTagline}
        </p>
      </div>
    </div>
  );
}
