import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { useEvent } from '../../lib/queries';
import { fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

// Post-RSVP "what's next" rail. Replaces the dead-end Calendar + Share/Invite
// block with concrete next actions:
//   1. View my ticket (lands on /me/rsvps)
//   2. Open event (back to detail screen)
//   3. Q&A (where members can ask before the event)
//   4. Materials (placeholder — only goes live after host uploads)
// `.ics` calendar wiring is owned by the Member agent and lives on a separate
// affordance below the rail.
export function RsvpConfirmationScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);

  return (
    <Screen>
      <AppBar
        showTitle={false}
        trailing={
          <button
            onClick={() => nav('/events')}
            className="ic-btn"
            aria-label={t.app.close}
          >
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex flex-1 flex-col items-center px-5 pb-10 text-center">
        <div
          className="blob mt-6"
          style={{ background: 'rgb(var(--success-wash))', color: 'rgb(var(--success))' }}
        >
          <Icon name="check_circle" size={46} />
        </div>
        <h1 className="t-display-md mb-1.5 mt-5">{t.events.confirmTitle}</h1>
        <p className="t-body-lg mb-6" style={{ color: 'rgb(var(--muted))', margin: 0 }}>
          {t.events.confirmBody}
        </p>

        {ev && (
          <Card className="mt-5 w-full p-3.5 text-start">
            <div className="event-card" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="cover imgph">
                <span className="lbl">cover</span>
              </div>
              <div className="body">
                <span className="when">{fmtEventWhen(ev.startAt).line}</span>
                <span className="ttl">{ev.title}</span>
                {ev.location?.name && (
                  <span className="meta">
                    <Icon name="place" size={14} />
                    {ev.location.name}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* What's next rail */}
        <div className="t-label-sm mt-6 w-full text-start" style={{ marginBottom: 8 }}>
          What's next
        </div>
        <div className="flex w-full flex-col gap-2">
          <NextActionRow
            icon="confirmation_number"
            title="View my ticket"
            body="Check-in code and event details"
            onClick={() => nav('/me/rsvps')}
          />
          <NextActionRow
            icon="event"
            title="Open event"
            body="See agenda, speakers and updates"
            onClick={() => nav(`/events/${eid}`)}
          />
          <NextActionRow
            icon="forum"
            title="Q&A is now open"
            body="Ask the host before the event starts"
            onClick={() => nav(`/events/${eid}/qa`)}
          />
          <NextActionRow
            icon="folder_open"
            title="Materials"
            body="Appears when the host uploads slides or files"
            disabled
          />
        </div>

        <div className="mt-5 w-full">
          <AppButton variant="secondary">
            <span className="msr">calendar_add_on</span>
            {t.events.addToCalendar}
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}

function NextActionRow({
  icon,
  title,
  body,
  onClick,
  disabled,
}: {
  icon: string;
  title: string;
  body: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const interactive = !disabled && !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        textAlign: 'start',
        width: '100%',
        cursor: interactive ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        className="grid place-items-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgb(var(--brand-wash))',
          color: 'rgb(var(--brand-ink))',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={20} />
      </span>
      <div style={{ flex: 1 }}>
        <div className="t-label-lg" style={{ fontSize: 14 }}>
          {title}
        </div>
        <div className="t-body-md" style={{ margin: '2px 0 0', fontSize: 12 }}>
          {body}
        </div>
      </div>
      {interactive && <Icon name="chevron_right" size={20} className="muted" />}
    </button>
  );
}
