import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function GenericErrorScreen({ message, onRetry }: Props) {
  return (
    <Screen>
      <AppBar title="Something went wrong" />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span
          className="grid place-items-center mb-4"
          style={{
            width: 104,
            height: 104,
            borderRadius: '50%',
            background: 'rgb(var(--error-wash))',
            color: 'rgb(var(--error))',
          }}
        >
          <Icon name="cloud_off" size={52} />
        </span>
        <h1 className="font-display text-3xl text-ink mb-2">Something went wrong</h1>
        <p className="t-body-md max-w-xs mb-6" style={{ margin: 0 }}>
          {message ?? "An unexpected error happened on our end — not you. We've been notified."}
        </p>
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <AppButton variant="secondary" onClick={() => window.location.reload()}>
            Try again
          </AppButton>
          <AppButton variant="primary" onClick={onRetry ?? (() => (window.location.href = '/home'))}>
            Back to home
          </AppButton>
        </div>
      </footer>
    </Screen>
  );
}
