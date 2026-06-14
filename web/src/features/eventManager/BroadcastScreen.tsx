// 44 · Broadcast composer — Event Manager push/in-app/email message
// Design: commuinites_design/Batch C · 44 · Broadcast composer
// Layout: back · "Broadcast" title + event subtitle · recipient row (going +
// waitlist split) · Message textarea · Schedule toggle (reveals datetime
// picker) · ChannelChips (Push / In-app / Email) with per-channel subtitles
// · live phone preview · primary "Send now · N recipients".

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { extractError } from '../../lib/api';
import { fmtEventWhen } from '../../lib/format';
import {
  useEvent,
  useEventAttendees,
  useEventBroadcast,
  type BroadcastChannel,
} from '../../lib/queries';

const CHANNEL_DEF: Array<{
  id: BroadcastChannel;
  label: string;
  icon: string;
  hint: string;
}> = [
  { id: 'push', label: 'Push', icon: 'notifications', hint: 'Phone notification' },
  { id: 'inApp', label: 'In-app', icon: 'inbox', hint: 'Inbox only' },
  { id: 'email', label: 'Email', icon: 'mail', hint: 'Sent to verified address' },
];

export function BroadcastScreen() {
  const { eid } = useParams<{ eid: string }>();
  const nav = useNavigate();
  const { data: ev } = useEvent(eid);
  const { data: attendees } = useEventAttendees(eid);
  const broadcast = useEventBroadcast(eid);

  const [message, setMessage] = useState('');
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [channels, setChannels] = useState<Set<BroadcastChannel>>(
    new Set(['push', 'inApp']),
  );
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const goingCount = useMemo(
    () => (attendees ?? []).filter((a) => a.status === 'going').length,
    [attendees],
  );
  const waitlistCount = useMemo(
    () => (attendees ?? []).filter((a) => a.status === 'waitlist').length,
    [attendees],
  );
  // Single recipient model: everyone who would be affected by the event —
  // confirmed going + waitlist. This kills the prior "12 people" vs "Waitlist
  // members (3) also get notified" double-count ambiguity.
  const totalRecipients = goingCount + waitlistCount;

  function toggleChannel(c: BroadcastChannel): void {
    setError(null);
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  // Inline validation surfaces issues as the EM toggles things instead of only
  // on submit. We still gate submit on the same checks below.
  const inlineWarn = useMemo<string | null>(() => {
    if (channels.size === 0) return 'Pick at least one channel below';
    if (scheduleOn && !scheduleAt) return 'Pick a date and time';
    return null;
  }, [channels, scheduleOn, scheduleAt]);

  async function send(): Promise<void> {
    setError(null);
    if (!message.trim()) {
      setError('Write a message');
      return;
    }
    if (channels.size === 0) {
      setError('Pick at least one channel');
      return;
    }
    if (scheduleOn && !scheduleAt) {
      setError('Pick a date and time');
      return;
    }
    try {
      await broadcast.mutateAsync({
        message: message.trim(),
        channels: Array.from(channels),
        scheduleAt: scheduleOn ? new Date(scheduleAt).toISOString() : undefined,
      });
      setSent(true);
      setTimeout(() => nav(-1), 1200);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  const subtitle = ev ? `${ev.title} · ${fmtEventWhen(ev.startAt).line}` : undefined;

  return (
    <Screen>
      <AppBar
        title="Broadcast"
        subtitle={subtitle}
        leading={
          <button
            type="button"
            className="ic-btn"
            onClick={() => nav(-1)}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        }
      />

      <main className="flex flex-1 flex-col px-5 pb-6">
        {/* RecipientRow — split into recipient counts + event anchor */}
        <div
          className="list-row"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <Icon name="group" style={{ color: 'rgb(var(--brand))' }} />
          <div className="grow flex-1 min-w-0">
            <div className="t-body-lg" style={{ fontSize: 14, margin: 0 }}>
              To: {goingCount} going
              {waitlistCount > 0 ? ` + ${waitlistCount} waitlist` : ''}
            </div>
            <div
              className="t-body-md truncate"
              style={{ margin: 0, fontSize: 11 }}
            >
              {ev?.title ?? 'This event'}
            </div>
          </div>
          <span className="t-label-sm" style={{ margin: 0 }}>
            {totalRecipients} {totalRecipients === 1 ? 'person' : 'people'}
          </span>
        </div>

        {/* MessageField */}
        <div className="field" style={{ marginTop: 14 }}>
          <label>Message</label>
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Reminder — we're meeting tonight. Bring a friend!"
              rows={5}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
              style={{ lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Live preview — small phone frame so the EM can sanity-check the
            push title / body before it goes to dozens of people. */}
        <BroadcastPreview eventTitle={ev?.title ?? 'Event'} message={message} />

        {/* ScheduleToggle */}
        <button
          type="button"
          className="list-row"
          onClick={() => setScheduleOn((v) => !v)}
          aria-pressed={scheduleOn}
          style={{ background: 'transparent', border: 0, width: '100%', cursor: 'pointer' }}
        >
          <Icon name="schedule" className="muted" />
          <span className="grow t-body-lg flex-1 text-start" style={{ fontSize: 14 }}>
            Schedule for later
          </span>
          <span className={`toggle ${scheduleOn ? 'on' : 'off'}`}>
            <span />
          </span>
        </button>

        {scheduleOn && (
          <div className="field" style={{ marginTop: -4 }}>
            <label>Date &amp; time</label>
            <div className="control">
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="grow w-full bg-transparent text-sm text-ink focus:outline-none"
                style={{ colorScheme: 'light' }}
              />
            </div>
          </div>
        )}

        {/* ChannelChips with per-channel hints */}
        <div className="t-label-sm" style={{ margin: '14px 0 8px' }}>
          Deliver via
        </div>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {CHANNEL_DEF.map((c) => {
            const active = channels.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleChannel(c.id)}
                aria-pressed={active}
                className="list-row"
                style={{
                  background: active ? 'rgb(var(--brand-wash))' : 'transparent',
                  borderColor: active ? 'rgb(var(--brand-wash))' : 'rgb(var(--border))',
                  border: '1px solid',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <Icon
                  name={c.icon}
                  style={{
                    color: active ? 'rgb(var(--brand-ink))' : 'rgb(var(--muted))',
                  }}
                />
                <div className="grow flex-1 min-w-0 text-start">
                  <div className="t-body-lg" style={{ fontSize: 14, margin: 0 }}>
                    {c.label}
                  </div>
                  <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
                    {c.hint}
                  </div>
                </div>
                <span
                  className="ck"
                  aria-hidden
                  style={{
                    background: active ? 'rgb(var(--brand))' : 'transparent',
                    borderColor: active ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
                  }}
                >
                  {active && <Icon name="check" size={15} />}
                </span>
              </button>
            );
          })}
        </div>

        {inlineWarn && !error && (
          <div
            className="mt-3 t-body-md"
            style={{ color: 'rgb(var(--warning, 173 99 18))', fontSize: 12 }}
          >
            {inlineWarn}
          </div>
        )}
        {error && (
          <div className="mt-3 t-body-md" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}
        {sent && (
          <div
            className="mt-3 t-body-md"
            style={{ color: 'rgb(var(--success))' }}
          >
            {scheduleOn ? 'Scheduled' : 'Sent'}
          </div>
        )}

        {/* SendButton */}
        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={send}
            disabled={broadcast.isPending || !message.trim()}
          >
            <Icon name="send" size={20} />
            {scheduleOn
              ? `Schedule · ${totalRecipients} recipients`
              : `Send now · ${totalRecipients} recipients`}
          </button>
        </div>
      </main>
    </Screen>
  );
}

// Small 60×100-ish phone-frame preview rendered live as the EM types. Solves a
// class of "oops typo" support tickets without needing to actually send.
function BroadcastPreview({
  eventTitle,
  message,
}: {
  eventTitle: string;
  message: string;
}) {
  const preview = message.trim() || 'Your message will preview here…';
  return (
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 18,
          minWidth: 18,
          paddingTop: 8,
          color: 'rgb(var(--muted))',
        }}
      >
        <Icon name="preview" size={16} />
      </div>
      <div
        className="card"
        style={{
          flex: 1,
          padding: 12,
          background: 'rgb(var(--surface-2))',
          borderRadius: 14,
        }}
      >
        <div
          className="t-label-sm"
          style={{ margin: '0 0 6px', textTransform: 'uppercase', fontSize: 10 }}
        >
          Preview
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <span
            className="t-ic"
            style={{
              background: 'rgb(var(--brand))',
              color: '#fff',
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="campaign" size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="t-label-lg truncate"
              style={{ fontSize: 12.5 }}
            >
              {eventTitle}
            </div>
            <div
              className="t-body-md"
              style={{
                margin: 0,
                fontSize: 12,
                color: message.trim() ? 'rgb(var(--on-bg))' : 'rgb(var(--muted))',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {preview}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
