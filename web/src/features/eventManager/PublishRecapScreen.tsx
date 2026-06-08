// 45 · Publish recap — Event Manager wrap-up screen
// Design: commuinites_design/Batch C · 45 · Publish recap
// Layout: back · AttendanceKPIs (Attended / Rating) auto-filled · Recap note textarea
// · Photos 4-up grid w/ + tile · Notify-attendees toggle · primary "Publish recap".

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { api, extractError } from '../../lib/api';
import { useEvent, useEventAttendees, usePublishRecap } from '../../lib/queries';

export function PublishRecapScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: attendees } = useEventAttendees(eid);
  const publish = usePublishRecap(eid);

  const [body, setBody] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoDraft, setPhotoDraft] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/events/${eid}`);
        if (!alive) return;
        const summary = (r.data?.data?.summary as { body?: string; photoUrls?: string[] }) ?? {};
        if (summary.body) setBody(summary.body);
        if (Array.isArray(summary.photoUrls)) setPhotoUrls(summary.photoUrls);
      } catch {
        // first publish, nothing to seed.
      }
    })();
    return () => {
      alive = false;
    };
  }, [eid]);

  const attendedCount = (attendees ?? []).filter((a) => a.attendedAt).length;
  const ratingPlaceholder = '—';

  function addPhoto(): void {
    const u = photoDraft.trim();
    if (!u) return;
    if (photoUrls.length >= 12) return;
    setPhotoUrls((prev) => [...prev, u]);
    setPhotoDraft('');
    setShowAdd(false);
  }

  function removePhoto(i: number): void {
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(): Promise<void> {
    setError(null);
    if (body.trim().length < 1) {
      setError('Write a recap note');
      return;
    }
    try {
      await publish.mutateAsync({ body: body.trim(), photoUrls, notify });
      nav(`/events/${eid}/recap`);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  // Render up to 3 photos + 1 add tile (4-up grid like the design).
  const photoSlots = photoUrls.slice(0, 12);

  return (
    <Screen>
      <AppBar back title="Publish recap" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        {ev && (
          <p className="t-body-md" style={{ margin: '0 0 10px' }}>
            {ev.title}
          </p>
        )}

        {/* AttendanceKPIs */}
        <div className="row" style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
          <div className="kpi grow" style={{ flex: 1 }}>
            <div className="k-lbl">Attended</div>
            <div className="k-num">{attendedCount}</div>
          </div>
          <div className="kpi grow" style={{ flex: 1 }}>
            <div className="k-lbl">Rating</div>
            <div className="k-num">{ratingPlaceholder}</div>
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

        {/* PhotoGridUpload */}
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
              onClick={() => setShowAdd(true)}
              className="imgph"
              style={{
                aspectRatio: '1',
                borderRadius: 9,
                backgroundColor: 'rgb(var(--surface-2))',
                cursor: 'pointer',
              }}
              aria-label="Add photo"
            >
              <Icon name="add" className="muted" />
            </button>
          )}
        </div>

        {showAdd && (
          <div className="card mb-3" style={{ padding: 12 }}>
            <label className="t-label-sm" style={{ marginBottom: 6, display: 'block' }}>
              Photo URL
            </label>
            <div className="control" style={{ marginBottom: 8 }}>
              <input
                value={photoDraft}
                onChange={(e) => setPhotoDraft(e.target.value)}
                placeholder="https://…"
                className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setPhotoDraft('');
                  setShowAdd(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={addPhoto}
                disabled={!photoDraft.trim()}
              >
                Add
              </button>
            </div>
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
            onClick={submit}
            disabled={publish.isPending || body.trim().length < 1}
          >
            {publish.isPending ? 'Publishing…' : 'Publish recap'}
          </button>
        </div>
      </main>
    </Screen>
  );
}
