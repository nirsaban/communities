import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { useEvent } from '../../lib/queries';

export function WaitlistJoinedScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);

  const total = ev?.rsvpStats?.waitlist ?? 0;
  // Position = total because we land here right after joining.
  const position = Math.max(1, total);

  return (
    <Screen>
      <AppBar
        showTitle={false}
        trailing={
          <button
            onClick={() => nav(`/events/${eid}`)}
            className="ic-btn"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center">
        <div
          className="blob"
          style={{
            background: 'rgb(var(--warning-wash))',
            color: 'rgb(var(--warning))',
            marginTop: 24,
          }}
        >
          <Icon name="hourglass_top" size={46} />
        </div>
        <h1 className="t-display-md" style={{ margin: '20px 0 6px' }}>
          You're on the list
        </h1>
        <p
          className="t-body-lg"
          style={{ color: 'rgb(var(--muted))', margin: '0 0 22px' }}
        >
          {ev?.title ?? 'This event'} is full — but spots open up often.
        </p>

        <Card
          className="text-center"
          style={{ width: '100%', padding: 18, marginBottom: 18 }}
        >
          <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
            Your position
          </div>
          <div
            className="t-display-lg"
            style={{ color: 'rgb(var(--brand))', margin: '4px 0' }}
          >
            #{position}
          </div>
          <div className="t-body-md" style={{ margin: 0 }}>
            in the waitlist of {Math.max(1, total)}
          </div>
        </Card>

        <div
          className="flex items-start gap-2"
          style={{
            background: 'rgb(var(--surface-2))',
            borderRadius: 12,
            padding: '12px 14px',
            width: '100%',
          }}
        >
          <Icon name="notifications_active" className="text-brand" />
          <span
            className="t-body-md text-start"
            style={{ color: 'rgb(var(--on-bg))' }}
          >
            We'll notify you the moment a spot frees up — you'll have 2 hours to claim it.
          </span>
        </div>

        <div className="mt-auto w-full pt-6">
          <AppButton variant="secondary" onClick={() => nav(`/events/${eid}`)}>
            Got it
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
