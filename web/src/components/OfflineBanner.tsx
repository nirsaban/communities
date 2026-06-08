import { useOnlineStatus } from '../features/edge/OfflineScreen';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      className="safe-top"
      style={{
        position: 'fixed',
        insetInlineStart: 0,
        insetInlineEnd: 0,
        top: 0,
        zIndex: 60,
        background: 'rgb(var(--warning))',
        color: '#111',
        textAlign: 'center',
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Icon name="wifi_off" size={14} />
      You're offline — showing saved content
    </div>
  );
}
