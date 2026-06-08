import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { useEvent } from '../../lib/queries';
import { fmtEventWhen } from '../../lib/format';
import { t } from '../../i18n';

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

        <div className="mt-5 w-full">
          <AppButton>
            <span className="msr">calendar_add_on</span>
            {t.events.addToCalendar}
          </AppButton>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Chip>
            <span className="msr">ios_share</span>
            Share
          </Chip>
          <Chip>
            <span className="msr">group_add</span>
            Invite a friend
          </Chip>
        </div>
      </main>
    </Screen>
  );
}
