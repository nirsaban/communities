// 43 · Materials upload — Event Manager add-file screen
// Design: commuinites_design/Batch C · 43 · Materials upload
// Layout: back · large dashed file drop zone (pdf/mp4/ppt) · upload progress card
// · Title field · Description textarea · "Attendees only" toggle row · "Add to event"
// primary button pinned at bottom.

import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { extractError } from '../../lib/api';
import { useUploadMaterial, type MaterialType } from '../../lib/queries';

function inferType(file: File): MaterialType {
  const m = file.type.toLowerCase();
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('image/')) return 'image';
  if (
    m === 'application/vnd.ms-powerpoint' ||
    m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'slides';
  }
  return 'other';
}

function iconForType(t: MaterialType): { name: string; tone: string } {
  if (t === 'pdf') return { name: 'picture_as_pdf', tone: 'rgb(var(--error))' };
  if (t === 'video') return { name: 'movie', tone: 'rgb(var(--brand-ink))' };
  if (t === 'audio') return { name: 'graphic_eq', tone: 'rgb(var(--brand-ink))' };
  if (t === 'slides') return { name: 'slideshow', tone: '#5B3D9E' };
  if (t === 'image') return { name: 'image', tone: '#1F6F95' };
  return { name: 'attach_file', tone: 'rgb(var(--on-bg-2))' };
}

export function MaterialsUploadScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const upload = useUploadMaterial(eid);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attendeesOnly, setAttendeesOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  function onPick(picked: File | null): void {
    if (!picked) return;
    setFile(picked);
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
    // Simulate progress while the upload request is in-flight — multipart through axios
    // is fast enough that we just animate to 100 client-side.
    setProgress(0);
    const start = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(95, Math.round(elapsed / 50)));
      if (elapsed > 4800) window.clearInterval(tick);
    }, 80);
  }

  async function submit(): Promise<void> {
    setError(null);
    if (!file) {
      setError('Pick a file first');
      return;
    }
    if (!title.trim()) {
      setError('Add a title');
      return;
    }
    try {
      await upload.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        type: inferType(file),
        file,
      });
      setProgress(100);
      nav(`/events/${eid}/materials`);
    } catch (err) {
      setProgress(null);
      setError(extractError(err).message);
    }
  }

  const t = file ? inferType(file) : 'other';
  const icon = iconForType(t);
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;
  const uploading = progress != null && progress < 100;

  return (
    <Screen>
      <AppBar back title="Add material" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {/* FileDropZone */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="imgph"
          style={{
            height: 150,
            borderRadius: 14,
            marginBottom: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            border: '1.5px dashed rgb(var(--border-2))',
            background: 'rgb(var(--surface-2))',
            cursor: 'pointer',
          }}
        >
          <Icon name="upload_file" size={34} className="muted" />
          <span className="lbl">tap to choose a file · pdf, mp4, ppt</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          accept="video/*,audio/*,application/pdf,image/*,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        />

        {/* UploadProgressCard */}
        {file && (
          <div className="card" style={{ padding: 12, marginBottom: 16 }}>
            <div
              className="row"
              style={{ display: 'flex', gap: 11, marginBottom: 8, alignItems: 'center' }}
            >
              <Icon name={icon.name} size={20} style={{ color: icon.tone }} />
              <div className="grow flex-1 min-w-0">
                <div className="t-label-lg truncate" style={{ fontSize: 13 }}>
                  {file.name}
                </div>
                <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                  {sizeMb} MB · {uploading ? 'uploading…' : progress === 100 ? 'done' : 'ready'}
                </div>
              </div>
              <span
                className="t-label-sm"
                style={{ margin: 0, color: 'rgb(var(--brand-ink))' }}
              >
                {progress != null ? `${progress}%` : '100%'}
              </span>
            </div>
            <div className="progress-track" style={{ height: 5 }}>
              <span
                style={{
                  width: `${progress ?? 100}%`,
                  display: 'block',
                  height: '100%',
                  background: 'rgb(var(--brand))',
                  borderRadius: 9,
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
          </div>
        )}

        {/* TitleField */}
        <div className="field">
          <label>Title</label>
          <div className="control">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Parsha notes — Vayikra"
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* DescriptionField */}
        <div className="field">
          <label>
            Description{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              · optional
            </span>
          </label>
          <div
            className="control"
            style={{ height: 'auto', alignItems: 'flex-start', padding: '14px 16px' }}
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context for attendees…"
              rows={3}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
              style={{ lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* AttendeesOnlyToggle */}
        <button
          type="button"
          className="list-row"
          onClick={() => setAttendeesOnly((v) => !v)}
          aria-pressed={attendeesOnly}
          style={{ background: 'transparent', border: 0, width: '100%', cursor: 'pointer' }}
        >
          <Icon name="lock" className="muted" />
          <span className="grow t-body-lg flex-1 text-start" style={{ fontSize: 14 }}>
            Attendees only
          </span>
          <span className={`toggle ${attendeesOnly ? 'on' : 'off'}`}>
            <span />
          </span>
        </button>

        {/* AddButton */}
        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={upload.isPending || !file}
          >
            {upload.isPending ? 'Uploading…' : 'Add to event'}
          </button>
        </div>
      </main>
    </Screen>
  );
}
