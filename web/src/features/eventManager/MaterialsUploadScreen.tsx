// 43 · Materials upload — Event Manager add-file screen
// Design: commuinites_design/Batch C · 43 · Materials upload
// Layout: back · large dashed file drop zone (pdf/mp4/ppt/image/audio/slides)
// · upload progress card · Title field · Description textarea · "Visible to:"
// toggle row · "Add to event" primary button pinned at bottom.

import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { extractError } from '../../lib/api';
import { fmtEventWhen } from '../../lib/format';
import { useEvent, useUploadMaterial, type MaterialType } from '../../lib/queries';

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

type QueuedFile = {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'error' | 'cancelled';
  progress: number;
  error?: string;
};

export function MaterialsUploadScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const upload = useUploadMaterial(eid);
  const inputRef = useRef<HTMLInputElement>(null);

  // Multi-file workflow: workshop runners typically bring slides + handout +
  // recording. Each row gets its own per-file progress + cancel. Title field
  // is shared (used for the first file only; the rest inherit the filename so
  // we don't lose the per-file identity).
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attendeesOnly, setAttendeesOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  function makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function onPick(picked: FileList | null): void {
    if (!picked || picked.length === 0) return;
    const added: QueuedFile[] = Array.from(picked).map((file) => ({
      id: makeId(),
      file,
      status: 'queued',
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...added]);
    setError(null);
    // Auto-fill title from the first newly added file if blank.
    if (!title && added[0]) {
      setTitle(added[0].file.name.replace(/\.[^.]+$/, ''));
    }
    // Reset the input so the same file can be picked again later if needed.
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(id: string): void {
    const ctrl = abortRefs.current.get(id);
    if (ctrl) {
      ctrl.abort();
      abortRefs.current.delete(id);
    }
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  function patchQueue(id: string, patch: Partial<QueuedFile>): void {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function submit(): Promise<void> {
    setError(null);
    const pending = queue.filter((q) => q.status === 'queued' || q.status === 'error');
    if (pending.length === 0) {
      setError('Pick a file first');
      return;
    }
    if (!title.trim()) {
      setError('Add a title');
      return;
    }

    // Upload files sequentially so progress bars don't fight each other and so
    // the backend isn't hit with N concurrent multipart streams.
    let firstErr: string | null = null;
    for (let i = 0; i < pending.length; i++) {
      const q = pending[i];
      const controller = new AbortController();
      abortRefs.current.set(q.id, controller);
      patchQueue(q.id, { status: 'uploading', progress: 0, error: undefined });
      const fileTitle =
        i === 0
          ? title.trim()
          : `${title.trim()} · ${q.file.name.replace(/\.[^.]+$/, '')}`;
      try {
        await upload.mutateAsync({
          title: fileTitle,
          description: description.trim() || undefined,
          type: inferType(q.file),
          file: q.file,
          signal: controller.signal,
          onProgress: (pct) => patchQueue(q.id, { progress: pct }),
        });
        abortRefs.current.delete(q.id);
        patchQueue(q.id, { status: 'done', progress: 100 });
      } catch (err) {
        abortRefs.current.delete(q.id);
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          patchQueue(q.id, { status: 'cancelled', progress: 0 });
          continue;
        }
        const msg = extractError(err).message;
        patchQueue(q.id, { status: 'error', error: msg, progress: 0 });
        if (!firstErr) firstErr = msg;
      }
    }

    if (firstErr) {
      setError(firstErr);
      return;
    }
    // The EM was navigated to /events/:eid/materials before — that route is
    // available to all authenticated members (wrap, not wrapEM), so this is
    // valid for an Event Manager. Land them there to confirm the upload.
    nav(`/events/${eid}/materials`);
  }

  const hasQueue = queue.length > 0;
  const uploadingAny = queue.some((q) => q.status === 'uploading');
  const submitDisabled =
    upload.isPending ||
    uploadingAny ||
    queue.filter((q) => q.status === 'queued' || q.status === 'error').length === 0;

  const subtitle = ev ? `${ev.title} · ${fmtEventWhen(ev.startAt).line}` : undefined;

  return (
    <Screen>
      <AppBar back title="Add material" subtitle={subtitle} />
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
          <span className="lbl">
            tap to choose files · pdf, slides, video, audio, images
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
          accept="video/*,audio/*,application/pdf,image/*,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        />

        {/* UploadProgressCards (per file) */}
        {hasQueue && (
          <div className="space-y-2" style={{ marginBottom: 16 }}>
            {queue.map((q) => {
              const t = inferType(q.file);
              const icon = iconForType(t);
              const sizeMb = (q.file.size / 1024 / 1024).toFixed(1);
              const uploading = q.status === 'uploading';
              const done = q.status === 'done';
              const errored = q.status === 'error';
              const cancelled = q.status === 'cancelled';
              const statusLabel = uploading
                ? 'uploading…'
                : done
                  ? 'done'
                  : errored
                    ? q.error ?? 'failed'
                    : cancelled
                      ? 'cancelled'
                      : 'ready';
              return (
                <div key={q.id} className="card" style={{ padding: 12 }}>
                  <div
                    className="row"
                    style={{
                      display: 'flex',
                      gap: 11,
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Icon name={icon.name} size={20} style={{ color: icon.tone }} />
                    <div className="grow flex-1 min-w-0">
                      <div
                        className="t-label-lg truncate"
                        style={{ fontSize: 13 }}
                      >
                        {q.file.name}
                      </div>
                      <div
                        className="t-body-md"
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: errored
                            ? 'rgb(var(--error))'
                            : 'rgb(var(--muted))',
                        }}
                      >
                        {sizeMb} MB · {statusLabel}
                      </div>
                    </div>
                    {uploading ? (
                      <button
                        type="button"
                        onClick={() => removeFile(q.id)}
                        className="ic-btn"
                        aria-label="Cancel upload"
                        style={{
                          width: 28,
                          height: 28,
                          background: 'rgb(var(--surface-2))',
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    ) : done ? (
                      <span
                        className="t-label-sm"
                        style={{ margin: 0, color: 'rgb(var(--success))' }}
                      >
                        ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeFile(q.id)}
                        className="ic-btn"
                        aria-label="Remove file"
                        style={{
                          width: 28,
                          height: 28,
                          background: 'rgb(var(--surface-2))',
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                  <div className="progress-track" style={{ height: 5 }}>
                    <span
                      style={{
                        width: `${q.progress}%`,
                        display: 'block',
                        height: '100%',
                        background: errored
                          ? 'rgb(var(--error))'
                          : 'rgb(var(--brand))',
                        borderRadius: 9,
                        transition: 'width 0.2s linear',
                      }}
                    />
                  </div>
                </div>
              );
            })}
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

        {/* VisibilityToggle — explicit label pair so the EM knows exactly who can see */}
        <button
          type="button"
          className="list-row"
          onClick={() => setAttendeesOnly((v) => !v)}
          aria-pressed={attendeesOnly}
          style={{ background: 'transparent', border: 0, width: '100%', cursor: 'pointer' }}
        >
          <Icon
            name={attendeesOnly ? 'lock' : 'public'}
            className="muted"
          />
          <div className="grow flex-1 text-start">
            <div className="t-body-lg" style={{ margin: 0, fontSize: 14 }}>
              Visible to
            </div>
            <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
              {attendeesOnly ? 'Attendees only' : 'Anyone with the link'}
            </div>
          </div>
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
            disabled={submitDisabled}
          >
            {uploadingAny
              ? 'Uploading…'
              : queue.length > 1
                ? `Add ${queue.filter((q) => q.status !== 'done').length} to event`
                : 'Add to event'}
          </button>
        </div>
      </main>
    </Screen>
  );
}
