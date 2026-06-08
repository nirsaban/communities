import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';

export function NotFoundScreen() {
  const nav = useNavigate();
  return (
    <Screen>
      <AppBar back title="Not found" />
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
          <Icon name="travel_explore" size={52} />
        </span>
        <h1 className="font-display text-3xl text-ink mb-2">We can't find that</h1>
        <p className="t-body-md max-w-xs mb-6" style={{ margin: 0 }}>
          This page or event may have been moved, cancelled, or removed.
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <AppButton variant="secondary" onClick={() => nav(-1)}>
            Back
          </AppButton>
          <AppButton variant="primary" onClick={() => nav('/home')}>
            Back to home
          </AppButton>
        </div>
      </footer>
    </Screen>
  );
}
