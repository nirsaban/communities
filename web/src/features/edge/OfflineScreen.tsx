import { useEffect, useState } from 'react';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';

export function OfflineScreen() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return (
    <Screen>
      <AppBar title="Offline" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span
          className="grid place-items-center mb-4"
          style={{
            width: 104,
            height: 104,
            borderRadius: '50%',
            background: 'rgb(var(--surface-2))',
            color: 'rgb(var(--on-bg-2))',
          }}
        >
          <Icon name={online ? 'wifi' : 'wifi_off'} size={52} />
        </span>
        <h1 className="font-display text-3xl text-ink mb-2">
          {online ? "You're back online" : "You're offline"}
        </h1>
        <p className="t-body-md max-w-xs mb-6" style={{ margin: 0 }}>
          {online
            ? 'Connection restored. Your data is syncing now.'
            : "Check your connection and try again. Some actions will resume once you're back online."}
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <AppButton
          variant="primary"
          onClick={() => (online ? (window.location.href = '/home') : window.location.reload())}
        >
          {online ? 'Continue' : 'Try again'}
        </AppButton>
      </footer>
    </Screen>
  );
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
