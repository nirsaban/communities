import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { LoadingDots } from '../../components/LoadingDots';
import { StatusChip } from '../../components/Pill';
import { api } from '../../lib/api';
import { useEvent, useEventMaterials } from '../../lib/queries';

type Summary = {
  body?: string;
  photoUrls?: string[];
  publishedAt?: string;
};

export function PostEventSummaryScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: materials } = useEventMaterials(eid);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!eid) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const s = (r.data?.data?.summary as Summary) ?? null;
        setSummary(s);
      } catch {
        // recap may not exist yet
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  if (!ev) {
    return (
      <Screen>
        <AppBar back title="Recap" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const attended = ev.rsvpStats?.going ?? 0;
  const photos = summary?.photoUrls ?? [];
  const isManager = ev.isManager;

  // PRD 08 §5: recap is visible to attendees while the event is in any state;
  // post-completion, also visible to community members at large.
  const isCommunityOpen = ev.status === 'completed';
  const wasAttending = ev.myRsvp?.status === 'going';
  const canSee = isManager || wasAttending || isCommunityOpen;

  if (!canSee) {
    // Event hasn't started yet → no recap exists; nudge them to RSVP instead so
    // they're automatically eligible the moment the recap goes live.
    const upcoming = new Date(ev.startAt).getTime() > Date.now();
    return (
      <Screen>
        <AppBar back title="Recap" />
        <main className="flex-1 px-5 pb-6">
          <EmptyState
            icon="lock"
            title={upcoming ? 'Recap not published yet' : 'Recap is for attendees'}
            body={
              upcoming
                ? "RSVP now and you'll get the recap the second the host publishes it."
                : "The host hasn't opened this recap to the whole community yet."
            }
            action={
              <button
                onClick={() => nav(`/events/${eid}`)}
                className="chip"
                style={{ background: 'rgb(var(--brand))', color: '#fff', height: 36 }}
              >
                {upcoming ? 'RSVP to this event' : 'Open event details'}
              </button>
            }
          />
        </main>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppBar
        back
        title="Recap"
        trailing={
          isManager ? (
            <button
              onClick={() => nav(`/events/${eid}/recap/publish`)}
              className="ic-btn soft"
              aria-label="Edit recap"
              style={{ background: 'rgb(var(--brand))', color: '#fff' }}
            >
              <Icon name="edit" />
            </button>
          ) : (
            <button className="ic-btn" aria-label="Share">
              <Icon name="ios_share" />
            </button>
          )
        }
      />
      <main className="flex-1 px-5 pb-6">
        <StatusChip status="done" label={`Completed · ${new Date(ev.startAt).toLocaleDateString(undefined)}`} />
        <h1 className="t-display-md mb-4 mt-2">{ev.title} — recap</h1>

        <div className="row mb-5 flex gap-2.5">
          <Card className="flex-1 p-3 text-center">
            <div className="t-title-lg font-display">{attended}</div>
            <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
              Attended
            </div>
          </Card>
          <Card className="flex-1 p-3 text-center">
            <div className="t-title-lg font-display">{photos.length || '—'}</div>
            <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
              Photos
            </div>
          </Card>
          <Card className="flex-1 p-3 text-center">
            <div className="t-title-lg font-display">{materials?.length ?? '—'}</div>
            <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
              Materials
            </div>
          </Card>
        </div>

        {summary?.body ? (
          <p className="t-body-lg mb-5" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {summary.body}
          </p>
        ) : (
          <Card
            className="p-4 mb-5"
            style={{ background: 'rgb(var(--surface-2))', textAlign: 'center' }}
          >
            <Icon name="hourglass_empty" size={24} className="text-muted mb-1" />
            <div className="t-body-md" style={{ margin: 0 }}>
              {isManager ? "You haven't published a recap yet. Tap the pencil to write one." : 'The recap will be published soon.'}
            </div>
          </Card>
        )}

        {photos.length > 0 && (
          <>
            <div className="t-label-sm mb-2">Photo gallery</div>
            <div className="grid grid-cols-3 gap-1.5 mb-5">
              {photos.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(u)}
                  className="overflow-hidden"
                  style={{ aspectRatio: '1 / 1', borderRadius: 10, padding: 0 }}
                >
                  <img
                    src={u}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        <AppButton variant="secondary" onClick={() => nav(`/events/${eid}/materials`)}>
          <Icon name="folder_open" size={14} /> View materials
        </AppButton>
      </main>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      )}
    </Screen>
  );
}
