import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useLocaleStore, type Locale } from '../../i18n';

type Row = { icon: string; label: string; to?: string; tone?: 'bad'; action?: () => void };

export function SettingsScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = (next: Locale): void => {
    if (next === locale) return;
    setLocale(next);
    // Full reload so every captured-at-render bundle reference picks up the swap.
    window.location.reload();
  };

  const groups: Array<{ title: string; rows: Row[] }> = [
    {
      title: 'Account',
      rows: [
        { icon: 'edit', label: 'Edit profile', to: '/profile/edit' },
        { icon: 'lock', label: 'Change password', to: '/forgot' },
        { icon: 'mail', label: 'Email', to: '/profile/edit' },
      ],
    },
    {
      title: 'Notifications & privacy',
      rows: [
        { icon: 'notifications', label: 'Notifications', to: '/me/notifications/prefs' },
        { icon: 'shield', label: 'Privacy', to: '/profile/privacy' },
      ],
    },
    {
      title: 'Payments',
      rows: [
        { icon: 'credit_card', label: 'Memberships & history', to: '/me/subscriptions' },
      ],
    },
    {
      title: 'General',
      rows: [
        { icon: 'help', label: 'Help & support' },
        { icon: 'description', label: 'Terms of service' },
        { icon: 'policy', label: 'Privacy policy' },
      ],
    },
    {
      title: '',
      rows: [
        { icon: 'logout', label: 'Sign out', action: () => { auth.logout(); nav('/login', { replace: true }); } },
        { icon: 'delete_forever', label: 'Delete account', to: '/profile/delete', tone: 'bad' },
      ],
    },
  ];

  return (
    <Screen>
      <AppBar back title="Settings" />
      <main className="flex-1 px-5 pb-6">
        <section className="mb-5">
          <div className="t-label-sm mb-2">Language</div>
          <div className="card flex gap-2 p-1">
            {(['en', 'he'] as const).map((code) => (
              <button
                key={code}
                onClick={() => toggleLocale(code)}
                className="flex-1 py-2 rounded-md text-sm font-medium"
                style={{
                  background: locale === code ? 'rgb(var(--brand))' : 'transparent',
                  color: locale === code ? '#fff' : 'rgb(var(--on-bg))',
                }}
              >
                {code === 'en' ? 'English' : 'Hebrew'}
              </button>
            ))}
          </div>
        </section>

        {groups.map((g, gi) => (
          <section key={gi} className="mb-5">
            {g.title && <div className="t-label-sm mb-2">{g.title}</div>}
            <div className="card divide-y divide-border">
              {g.rows.map((r, ri) => (
                <button
                  key={ri}
                  onClick={() => (r.action ? r.action() : r.to ? nav(r.to) : null)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-surface2"
                  style={{ color: r.tone === 'bad' ? 'rgb(var(--error))' : 'rgb(var(--on-bg))' }}
                >
                  <Icon name={r.icon} size={20} />
                  <span className="t-label-lg flex-1">{r.label}</span>
                  <Icon name="chevron_right" size={20} className="text-muted" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </Screen>
  );
}
