import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Shimmer } from '../../components/Shimmer';
import { useEvent, useEventMaterials, useRsvp, type Material, type MaterialType } from '../../lib/queries';

function bytesLabel(n?: number): string {
  if (!n) return '';
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

const TYPE_META: Record<MaterialType, { icon: string; bg: string; color: string }> = {
  video: { icon: 'play_circle', bg: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' },
  audio: { icon: 'graphic_eq', bg: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' },
  pdf: { icon: 'picture_as_pdf', bg: 'rgb(var(--error-wash))', color: 'rgb(var(--error))' },
  image: { icon: 'image', bg: 'rgb(var(--surface-2))', color: 'rgb(var(--on-bg-2))' },
  slides: { icon: 'slideshow', bg: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' },
  other: { icon: 'attach_file', bg: 'rgb(var(--surface-2))', color: 'rgb(var(--on-bg-2))' },
};

const isRecording = (t: MaterialType): boolean => t === 'video' || t === 'audio';

export function MaterialsScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: materials, isLoading } = useEventMaterials(eid);
  const rsvp = useRsvp();

  const recordings: Material[] = materials?.filter((m) => isRecording(m.type)) ?? [];
  const others: Material[] = materials?.filter((m) => !isRecording(m.type)) ?? [];

  // PRD 08 §5: materials are an RSVPer perk. Managers always see them; others
  // must be confirmed attendees. Loading state defers the gate decision.
  const isLocked = ev != null && !ev.isManager && ev.myRsvp?.status !== 'going';
  // If the lock is in place because Mike just hasn't RSVPed yet to a free,
  // future event we can quick-RSVP him from here and unlock in-place.
  const canQuickRsvp =
    ev != null &&
    ev.priceCents === 0 &&
    ev.status === 'published' &&
    new Date(ev.startAt).getTime() > Date.now();

  return (
    <Screen>
      <AppBar
        back
        title="Materials"
        trailing={
          ev?.isManager ? (
            <button
              onClick={() => nav(`/events/${eid}/materials/upload`)}
              className="ic-btn soft"
              aria-label="Upload material"
              style={{ background: 'rgb(var(--brand))', color: '#fff' }}
            >
              <Icon name="upload" />
            </button>
          ) : undefined
        }
      />
      <main className="flex-1 px-5 pb-6 content-md lg:px-8">
        {ev && (
          <p className="t-body-md mt-0.5 mb-4">
            {ev.title}
          </p>
        )}

        {isLocked && (
          <EmptyState
            icon="lock"
            title="Materials are for attendees"
            body={
              ev?.status === 'completed'
                ? 'Materials from this event are reserved for the people who attended.'
                : canQuickRsvp
                ? "Tap RSVP and the materials unlock immediately — you'll also be on the guest list."
                : 'RSVP to this event to view the materials.'
            }
            action={
              <div className="flex flex-col gap-2" style={{ width: 220 }}>
                {canQuickRsvp && eid && (
                  <AppButton
                    loading={rsvp.isPending}
                    onClick={() => rsvp.mutate(eid)}
                  >
                    <Icon name="event_available" size={16} />
                    RSVP & unlock
                  </AppButton>
                )}
                <AppButton variant="secondary" onClick={() => nav(`/events/${eid}`)}>
                  Open event details
                </AppButton>
              </div>
            }
          />
        )}

        {!isLocked && (
          <>

        {isLoading && (
          <div className="space-y-3">
            <Shimmer style={{ height: 140, borderRadius: 12 }} />
            <Shimmer style={{ height: 56 }} />
            <Shimmer style={{ height: 56 }} />
          </div>
        )}

        {!isLoading && materials && materials.length === 0 && (
          <EmptyState
            icon="folder_open"
            title="No materials yet"
            body="After the event, the host will add recordings, documents, and links."
          />
        )}

        {recordings.length > 0 && (
          <>
            <div className="t-label-sm mb-2.5">Recordings</div>
            {recordings.map((m) => (
              <a
                key={m.id}
                href={m.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card mb-5 block overflow-hidden"
              >
                <div className="imgph relative" style={{ height: 140 }}>
                  <span className="lbl">{m.type}</span>
                  <span
                    className="absolute grid place-items-center"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      inset: '50% 0 0 50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <Icon name="play_arrow" size={30} className="!text-white" />
                  </span>
                </div>
                <div className="px-3 py-2 text-start">
                  <div className="t-label-lg">{m.title}</div>
                </div>
              </a>
            ))}
          </>
        )}

        {others.length > 0 && (
          <>
            <div className="t-label-sm mb-2">Documents and links</div>
            <div className="flex flex-col">
              {others.map((m) => {
                const meta = TYPE_META[m.type];
                return (
                  <a
                    key={m.id}
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="list-row flex items-center gap-3 text-start"
                  >
                    <span
                      className="grid flex-shrink-0 place-items-center"
                      style={{ width: 40, height: 40, borderRadius: 11, background: meta.bg, color: meta.color }}
                    >
                      <span className="msr">{meta.icon}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="t-label-lg truncate">{m.title}</div>
                      <div className="t-body-md" style={{ margin: 0 }}>
                        {bytesLabel(m.fileSizeBytes)}
                      </div>
                    </div>
                    <span className="ic-btn">
                      <Icon name="download" />
                    </span>
                  </a>
                );
              })}
            </div>
          </>
        )}
          </>
        )}
      </main>
    </Screen>
  );
}
