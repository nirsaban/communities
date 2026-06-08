// 44 · Broadcast composer — Event Manager push/in-app/email message
// Design: commuinites_design/Batch C · 44 · Broadcast composer
// Layout: close-X · "Broadcast" title · recipient row (To: All attendees · N people)
// · Message textarea · Schedule toggle (reveals datetime picker) · ChannelChips
// (Push / In-app / Email) · primary "Send now · N recipients".

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
import { extractError } from '../../lib/api';
import {
  useEvent,
  useEventAttendees,
  useEventBroadcast,
  type BroadcastChannel,
} from '../../lib/queries';

const CHANNEL_DEF: Array<{ id: BroadcastChannel; label: string; icon: string }> = [
  { id: 'push', label: 'Push', icon: 'notifications' },
  { id: 'inApp', label: 'In-app', icon: 'inbox' },
  { id: 'email', label: 'Email', icon: 'mail' },
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

  const recipientCount = useMemo(
    () => (attendees ?? []).filter((a) => a.status === 'going').length,
    [attendees],
  );
  const waitlistCount = useMemo(
    () => (attendees ?? []).filter((a) => a.status === 'waitlist').length,
    [attendees],
  );
  const totalRecipients = recipientCount + waitlistCount;

  function toggleChannel(c: BroadcastChannel): void {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

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

  return (
    <Screen>
      <AppBar
        title="Broadcast"
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
        {/* RecipientRow */}
        <div className="list-row" style={{ borderColor: 'rgb(var(--border))' }}>
          <Icon name="group" style={{ color: 'rgb(var(--brand))' }} />
          <span className="grow t-body-lg flex-1" style={{ fontSize: 14 }}>
            To: All attendees{ev?.title ? ` · ${ev.title}` : ''}
          </span>
          <span className="t-label-sm" style={{ margin: 0 }}>
            {recipientCount} {recipientCount === 1 ? 'person' : 'people'}
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

        {/* ChannelChips */}
        <div className="t-label-sm" style={{ margin: '14px 0 8px' }}>
          Deliver via
        </div>
        <div className="wrap flex flex-wrap" style={{ gap: 8 }}>
          {CHANNEL_DEF.map((c) => {
            const active = channels.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`chip ${active ? 'active' : ''}`}
                onClick={() => toggleChannel(c.id)}
                aria-pressed={active}
              >
                <Icon name={c.icon} size={16} />
                {c.label}
              </button>
            );
          })}
        </div>

        {waitlistCount > 0 && (
          <p className="t-body-md" style={{ margin: '12px 0 0', fontSize: 12 }}>
            Waitlist members ({waitlistCount}) also get notified.
          </p>
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
