import { useEffect, useState } from 'react';
import { AppBar, Screen } from '../../components/AppBar';
import { LoadingDots } from '../../components/LoadingDots';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
  type NotificationPrefKey,
} from '../../lib/queries';

const CATEGORIES: Array<{ id: NotificationPrefKey; label: string; hint?: string }> = [
  { id: 'events', label: 'Events', hint: 'Reminders, changes, and cancellations' },
  { id: 'rsvp', label: 'RSVPs', hint: 'Your RSVP status updates' },
  { id: 'initiatives', label: 'Initiatives', hint: 'Updates on initiatives you support' },
  { id: 'posts', label: 'Posts', hint: 'New community posts' },
  { id: 'system', label: 'System', hint: 'Security, billing, and important alerts' },
];

export function NotificationPrefsScreen() {
  const { data, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [prefs, setPrefs] = useState<NotificationPrefs>({});

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  function toggle(cat: NotificationPrefKey, ch: 'push' | 'email'): void {
    const next: NotificationPrefs = {
      ...prefs,
      [cat]: { ...prefs[cat], [ch]: !prefs[cat]?.[ch] },
    };
    setPrefs(next);
    update.mutate(next);
  }

  if (isLoading) {
    return (
      <Screen>
        <AppBar back title="Notification preferences" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar back title="Notification preferences" />
      <main className="flex-1 px-5 pb-6">
        <p className="t-body-md mb-5">Choose which notifications you receive and where.</p>
        <div className="grid grid-cols-3 px-1 mb-2">
          <span className="t-label-sm">Category</span>
          <span className="t-label-sm text-center">Push</span>
          <span className="t-label-sm text-center">Email</span>
        </div>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const p = prefs[cat.id] ?? {};
            return (
              <div key={cat.id} className="grid grid-cols-3 items-center border-b border-border py-3">
                <div>
                  <div className="t-label-lg">{cat.label}</div>
                  {cat.hint && (
                    <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                      {cat.hint}
                    </div>
                  )}
                </div>
                <Toggle on={!!p.push} onClick={() => toggle(cat.id, 'push')} />
                <Toggle on={!!p.email} onClick={() => toggle(cat.id, 'email')} />
              </div>
            );
          })}
        </div>
      </main>
    </Screen>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`toggle ${on ? 'on' : 'off'} mx-auto`}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        position: 'relative',
        background: on ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
        border: 0,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          [on ? 'right' : 'left']: 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }}
      />
    </button>
  );
}
