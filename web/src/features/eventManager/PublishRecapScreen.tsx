// 45 · Publish recap — Event Manager wrap-up screen
// Design: commuinites_design/Batch C · 45 · Publish recap
// Layout: back + event subtitle · Attendance KPI · Recap note textarea (auto-
// templated) · Photos 4-up grid w/ + file-picker tile · Notify-attendees toggle
// · primary "Publish recap".

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { api, extractError } from '../../lib/api';
import { fmtEventWhen } from '../../lib/format';
import {
  useEvent,
  useEventAttendees,
  usePublishRecap,
  useUploadRecapPhoto,
} from '../../lib/queries';

export function PublishRecapScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: attendees } = useEventAttendees(eid);
  const publish = usePublishRecap(eid);
  const uploadPhoto = useUploadRecapPhoto(eid);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  // Two-step publish: tap "Publish recap" → confirm dialog (so the EM never
  // accidentally pushes a notification to every attendee). Then 'published'
  // shows an explicit success card with a "View recap" CTA instead of
  // silently navigating away.
  const [showConfirm, setShowConfirm] = useState(false);
  const [published, setPublished] = useState(false);
  // Track whether we've seeded the default template — we never want to clobber
  // text the EM has typed by re-running the autofill after attendees load.
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const summary = (r.data?.data?.summary as { body?: string; photoUrls?: string[] }) ?? {};
        if (summary.body) {
          setBody(summary.body);
          setSeeded(true);
        }
        if (Array.isArray(summary.photoUrls)) setPhotoUrls(summary.photoUrls);
      } catch {
        // first publish, nothing to seed.
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  // Auto-fill the body with a sensible default once we know the attendance
  // count + event title. Runs at most once and never overwrites existing text.
  useEffect(() => {
    if (seeded) return;
    if (!ev) return;
    if (body.trim().length > 0) return;
    const attended = (attendees ?? []).filter((a) => a.attendedAt).length;
    const peopleClause =
      attended > 0
        ? `Thank you to the ${attended} ${attended === 1 ? 'person' : 'people'} who joined us at ${ev.title}.`
        : `Thank you to everyone who joined us at ${ev.title}.`;
    setBody(`${peopleClause}\n\nRecording and notes are now available below.`);
    setSeeded(true);
  }, [ev, attendees, body, seeded]);

  const attendedCount = (attendees ?? []).filter((a) => a.attendedAt).length;

  function removePhoto(i: number): void {
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onPickPhotos(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    // Reset the input so picking the same file again still fires onChange.
    if (photoInputRef.current) photoInputRef.current.value = '';
    setUploadingCount((n) => n + list.length);
    for (const file of list) {
      if (photoUrls.length >= 12) break;
      try {
        const r = await uploadPhoto.mutateAsync({ file });
        if (r.fileUrl) {
          setPhotoUrls((prev) => (prev.length < 12 ? [...prev, r.fileUrl] : prev));
        }
      } catch (err) {
        if (
          axios.isCancel(err) ||
          (err as { name?: string })?.name === 'CanceledError'
        ) {
          // user cancelled — silent
        } else {
          setError(extractError(err).message);
        }
      } finally {
        setUploadingCount((n) => Math.max(0, n - 1));
      }
    }
  }

  function requestPublish(): void {
    setError(null);
    if (body.trim().length < 1) {
      setError('Write a recap note');
      return;
    }
    setShowConfirm(true);
  }

  async function confirmPublish(): Promise<void> {
    setShowConfirm(false);
    setError(null);
    try {
      await publish.mutateAsync({ body: body.trim(), photoUrls, notify });
      setPublished(true);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  // Render up to 12 photos + 1 add tile (4-up grid like the design).
  const photoSlots = photoUrls.slice(0, 12);
  const subtitle = ev ? `${ev.title} · ${fmtEventWhen(ev.startAt).line}` : undefined;

  return (
    <Screen>
      <AppBar back title="Publish recap" subtitle={subtitle} />
      <main className="flex flex-1 flex-col px-5 pb-6 content-md lg:px-8">
        {/* AttendanceKPI — dropped the permanent "Rating —" placeholder; we'll
            add it back once member feedback collection lands. */}
        <div className="row" style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
          <div className="kpi grow" style={{ flex: 1 }}>
            <div className="k-lbl">
              <Icon name="how_to_reg" size={15} />
              Attended
            </div>
            <div className="k-num">{attendedCount}</div>
          </div>
        </div>

        {/* RecapNoteField */}
        <div className="field">
          <label>Recap note</label>
          <div
            className="control"
            style={{
              height: 'auto',
              alignItems: 'flex-start',
              padding: '14px 16px',
              minHeight: 120,
            }}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Thank you to everyone who joined… Recording & notes are now up."
              rows={5}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
              style={{ lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* PhotoGridUpload — real file picker (reuses /events/:eid/materials) */}
        <label className="t-label-sm" style={{ display: 'block', marginBottom: 8 }}>
          Photos
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {photoSlots.map((u, i) => (
            <div key={`${u}-${i}`} className="relative" style={{ aspectRatio: '1' }}>
              <img
                src={u}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="ic-btn"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 22,
                  height: 22,
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                }}
                aria-label="Remove photo"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          {photoSlots.length < 12 && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="imgph"
              style={{
                aspectRatio: '1',
                borderRadius: 9,
                backgroundColor: 'rgb(var(--surface-2))',
                cursor: 'pointer',
              }}
              aria-label="Add photos"
              disabled={uploadingCount > 0}
            >
              {uploadingCount > 0 ? (
                <Icon name="progress_activity" className="muted" />
              ) : (
                <Icon name="add_photo_alternate" className="muted" />
              )}
            </button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onPickPhotos(e.target.files)}
        />

        {uploadingCount > 0 && (
          <div className="t-body-md mb-3" style={{ fontSize: 12 }}>
            Uploading {uploadingCount} {uploadingCount === 1 ? 'photo' : 'photos'}…
          </div>
        )}

        {/* NotifyToggle */}
        <button
          type="button"
          className="list-row"
          onClick={() => setNotify((v) => !v)}
          aria-pressed={notify}
          style={{ background: 'transparent', border: 0, width: '100%', cursor: 'pointer' }}
        >
          <Icon name="notifications" className="muted" />
          <span className="grow t-body-lg flex-1 text-start" style={{ fontSize: 14 }}>
            Notify attendees
          </span>
          <span className={`toggle ${notify ? 'on' : 'off'}`}>
            <span />
          </span>
        </button>

        {error && (
          <div className="mt-3 t-body-md" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {/* PublishButton */}
        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={requestPublish}
            disabled={publish.isPending || body.trim().length < 1 || uploadingCount > 0}
          >
            {publish.isPending ? 'Publishing…' : 'Publish recap'}
          </button>
        </div>
      </main>

      {showConfirm && (
        <ConfirmPublishSheet
          attendedCount={attendedCount}
          notify={notify}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmPublish}
          pending={publish.isPending}
        />
      )}

      {published && (
        <PublishedSheet
          notified={notify}
          onView={() => nav(`/events/${eid}/recap`)}
          onClose={() => setPublished(false)}
        />
      )}
    </Screen>
  );
}

function ConfirmPublishSheet({
  attendedCount,
  notify,
  onCancel,
  onConfirm,
  pending,
}: {
  attendedCount: number;
  notify: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={pending ? undefined : onCancel}
    >
      <div
        className="card"
        style={{ padding: 20, maxWidth: 360, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="t-title-md" style={{ marginBottom: 8 }}>
          Publish recap?
        </div>
        <p className="t-body-md" style={{ margin: '0 0 14px' }}>
          {notify
            ? `This will publish the recap and send a notification to ${attendedCount} ${
                attendedCount === 1 ? 'attendee' : 'attendees'
              }.`
            : 'This will publish the recap. Attendees won’t be notified.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishedSheet({
  notified,
  onView,
  onClose,
}: {
  notified: boolean;
  onView: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ padding: 22, maxWidth: 360, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2"
          style={{ color: 'rgb(var(--success))', marginBottom: 8 }}
        >
          <Icon name="check_circle" size={22} />
          <span className="t-title-md">Recap published</span>
        </div>
        <p className="t-body-md" style={{ margin: '0 0 14px' }}>
          {notified
            ? 'Attendees were notified and can read it in their inbox.'
            : 'Recap is live for attendees in the event detail.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Stay here
          </button>
          <button type="button" className="btn btn-primary" onClick={onView}>
            View recap
          </button>
        </div>
      </div>
    </div>
  );
}
