// 27 (member) / 46 (manager) · Q&A
// Two-mode screen — keys off `ev.isManager`.
//
// • Member mode (PRD 08 §5 · screen 27): read-open to any viewer, ask + upvote
//   reserved for confirmed attendees. Bottom composer is the primary action.
// • Manager mode (PRD 06 §4 · screen 46): title is "Q&A · N open" with event
//   subtitle, an inline seg control (Open / All / Resolved) under the AppBar,
//   real asker names in card headers, Answer as the primary action, Pin
//   demoted to an overflow menu, and "Mark resolved" only shown once an answer
//   exists (kills the unanswered-resolve footgun).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { Shimmer } from '../../components/Shimmer';
import { fmtEventWhen } from '../../lib/format';
import {
  useAnswerQA,
  useAskQuestion,
  useEvent,
  useEventQA,
  usePinQA,
  useResolveQA,
  useUpvoteQA,
  type QAItem,
} from '../../lib/queries';

type ManagerFilter = 'open' | 'all' | 'resolved';

const MGR_FILTER_STORAGE_KEY = 'em.qa.filter';

function readStoredManagerFilter(): ManagerFilter {
  if (typeof window === 'undefined') return 'open';
  try {
    const v = window.localStorage.getItem(MGR_FILTER_STORAGE_KEY);
    if (v === 'open' || v === 'all' || v === 'resolved') return v;
  } catch {
    // localStorage unavailable (private browsing, SSR, etc) — fall through.
  }
  return 'open';
}

export function EventQAScreen() {
  const { eid } = useParams<{ eid: string }>();
  const { data: items, isLoading } = useEventQA(eid);
  const { data: ev } = useEvent(eid);
  const ask = useAskQuestion(eid);
  const upvote = useUpvoteQA(eid);
  const answer = useAnswerQA(eid);
  const pin = usePinQA(eid);
  const resolve = useResolveQA(eid);
  const [draft, setDraft] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  // Manager filter is sticky across navigations + reload — a triage workflow
  // (filter to Open, answer one, navigate away to fact-check, come back) is
  // useless if every return trip resets to default.
  const [mgrFilter, setMgrFilter] = useState<ManagerFilter>(() =>
    readStoredManagerFilter(),
  );
  useEffect(() => {
    try {
      window.localStorage.setItem(MGR_FILTER_STORAGE_KEY, mgrFilter);
    } catch {
      // ignore quota / private-mode errors
    }
  }, [mgrFilter]);
  const isManager = ev?.isManager === true;
  // PRD 08 §5: Q&A is read-open to any authenticated viewer of the event, but
  // ask + upvote are reserved for confirmed attendees (managers always allowed).
  const canEngage = isManager || ev?.myRsvp?.status === 'going';

  function submit(): void {
    const trimmed = draft.trim();
    if (!trimmed) return;
    ask.mutate(trimmed, {
      onSuccess: () => setDraft(''),
    });
  }

  // Manager view: float unanswered & unresolved to the top, then pinned, then
  // resolved. Member view keeps the backend order so upvoted questions naturally
  // bubble up.
  const sorted = useMemo<QAItem[]>(() => {
    const all = items ?? [];
    if (!isManager) return all;
    const rank = (q: QAItem): number => {
      if (!q.answer && !q.resolved) return 0; // unanswered → top
      if (q.pinned && !q.resolved) return 1;
      if (q.resolved) return 3;
      return 2;
    };
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [items, isManager]);

  const filtered = useMemo<QAItem[]>(() => {
    if (!isManager) return sorted;
    if (mgrFilter === 'all') return sorted;
    if (mgrFilter === 'resolved') return sorted.filter((q) => q.resolved);
    return sorted.filter((q) => !q.resolved);
  }, [sorted, isManager, mgrFilter]);

  const openCount = (items ?? []).filter((q) => !q.resolved).length;
  const allCount = (items ?? []).length;
  const resolvedCount = (items ?? []).filter((q) => q.resolved).length;
  const subtitle = ev ? `${ev.title} · ${fmtEventWhen(ev.startAt).line}` : undefined;

  return (
    <Screen>
      <AppBar
        back
        title={isManager ? `Q&A · ${openCount} open` : 'Q&A'}
        subtitle={isManager ? subtitle : undefined}
      />

      {isManager && (
        <div className="px-5" style={{ paddingTop: 4 }}>
          <div className="seg" style={{ marginBottom: 10 }} role="tablist">
            {(['open', 'all', 'resolved'] as ManagerFilter[]).map((id) => {
              const label = id === 'open' ? 'Open' : id === 'resolved' ? 'Resolved' : 'All';
              const count =
                id === 'open' ? openCount : id === 'all' ? allCount : resolvedCount;
              const on = mgrFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`s ${on ? 'on' : ''}`}
                  onClick={() => setMgrFilter(id)}
                >
                  {label}
                  {items && (
                    <span
                      className="t-label-sm"
                      style={{ marginInlineStart: 4, opacity: 0.7 }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 px-5 pb-2">
        {!isManager && <QAHowItWorks empty={!isLoading && filtered.length === 0} />}

        {isLoading && (
          <div className="space-y-3 pt-3">
            <Shimmer style={{ height: 110 }} />
            <Shimmer style={{ height: 80 }} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon="forum"
            title={isManager ? 'Nothing to answer' : 'No questions yet'}
            body={
              isManager
                ? mgrFilter === 'resolved'
                  ? 'Resolved questions will show up here.'
                  : "You're all caught up."
                : 'Be the first to ask — the host will see it here.'
            }
          />
        )}

        <div className="space-y-3 pt-2">
          {filtered.map((q) =>
            isManager ? (
              <ManagerCard
                key={q.id}
                q={q}
                answering={answeringId === q.id}
                onStartAnswer={() => {
                  setAnsweringId(q.id);
                  setAnswerDraft('');
                }}
                onCancelAnswer={() => {
                  setAnsweringId(null);
                  setAnswerDraft('');
                }}
                onSubmitAnswer={(body) =>
                  answer.mutate(
                    { qid: q.id, body },
                    {
                      onSuccess: () => {
                        setAnsweringId(null);
                        setAnswerDraft('');
                      },
                    },
                  )
                }
                answerDraft={answerDraft}
                setAnswerDraft={setAnswerDraft}
                onPin={() => pin.mutate(q.id)}
                onResolve={() => resolve.mutate(q.id)}
                busy={answer.isPending}
              />
            ) : (
              <MemberCard
                key={q.id}
                q={q}
                canEngage={canEngage}
                onUpvote={() => canEngage && upvote.mutate(q.id)}
              />
            ),
          )}
        </div>
      </main>

      {isManager ? null : canEngage ? (
        <footer
          className="safe-bottom border-t px-4 py-3"
          style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
        >
          <div
            className="control flex items-center gap-2.5"
            style={{
              height: 46,
              padding: '0 14px',
              background: 'rgb(var(--surface-2))',
              border: '1.5px solid rgb(var(--border-2))',
              borderRadius: 999,
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ask a question…"
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={!draft.trim() || ask.isPending}
              className="ic-btn soft"
              style={{
                width: 34,
                height: 34,
                background: 'rgb(var(--brand))',
                color: '#fff',
                opacity: !draft.trim() || ask.isPending ? 0.5 : 1,
              }}
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </footer>
      ) : (
        <footer
          className="safe-bottom border-t px-4 py-3 text-center"
          style={{ background: 'rgb(var(--surface-2))', borderColor: 'rgb(var(--border))' }}
        >
          <span className="t-body-md" style={{ margin: 0, fontSize: 12 }}>
            <Icon name="lock" size={12} /> RSVP to ask questions and vote
          </span>
        </footer>
      )}
    </Screen>
  );
}

// Short explainer banner shown to members above the Q&A list. Persists a
// dismissed flag in localStorage so repeat visitors only see it once, but the
// banner is force-shown on empty/first-time visits so new attendees always
// learn the rules of the room.
function QAHowItWorks({ empty }: { empty: boolean }) {
  const KEY = 'qa.howItWorks.dismissed';
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  if (dismissed && !empty) return null;
  return (
    <div
      className="card mt-3 mb-3"
      style={{ padding: 12, background: 'rgb(var(--brand-wash))', borderColor: 'transparent' }}
    >
      <div className="flex items-start gap-2.5">
        <span style={{ color: 'rgb(var(--brand-ink))', marginTop: 2 }}>
          <Icon name="help" size={18} />
        </span>
        <div className="flex-1">
          <div className="t-label-lg" style={{ marginBottom: 4 }}>
            How Q&amp;A works
          </div>
          <ul
            className="t-body-md"
            style={{ margin: 0, paddingInlineStart: 16, lineHeight: 1.45 }}
          >
            <li>Anyone in the event can read the questions here.</li>
            <li>RSVP'd attendees can ask new questions and upvote others.</li>
            <li>Event managers and admins answer questions; their reply gets a verified badge.</li>
            <li>Pinned answers stay at the top so latecomers see the most-asked questions first.</li>
          </ul>
        </div>
        {!empty && (
          <button
            type="button"
            aria-label="Dismiss"
            className="ic-btn soft"
            style={{ width: 28, height: 28 }}
            onClick={() => {
              try {
                window.localStorage.setItem(KEY, '1');
              } catch {
                /* private mode — banner just won't persist dismissal */
              }
              setDismissed(true);
            }}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Member card (screen 27) =====

function MemberCard({
  q,
  canEngage,
  onUpvote,
}: {
  q: QAItem;
  canEngage: boolean;
  onUpvote: () => void;
}) {
  const askerName = q.authorName?.trim() || 'Community member';
  return (
    <Card className="p-3.5">
      <div className="mb-2 flex items-center gap-2.5">
        <Avatar name={askerName} src={q.authorPhotoUrl ?? undefined} size={32} />
        <div className="flex-1">
          <div className="t-label-lg">{askerName}</div>
          <div className="t-body-md" style={{ margin: 0, fontSize: 11 }}>
            {new Date(q.createdAt).toLocaleDateString(undefined)}
          </div>
        </div>
        {q.pinned && (
          <span
            className="chip"
            style={{
              height: 28,
              background: 'rgb(var(--brand-wash))',
              color: 'rgb(var(--brand-ink))',
              borderColor: 'transparent',
            }}
          >
            <Icon name="push_pin" size={14} />
          </span>
        )}
        <button
          onClick={onUpvote}
          disabled={!canEngage}
          className="chip"
          style={{
            background: q.upvoted ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
            color: q.upvoted ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
            borderColor: 'transparent',
            height: 30,
            opacity: canEngage ? 1 : 0.5,
          }}
        >
          <Icon name="arrow_upward" size={16} />
          {q.upvoteCount}
        </button>
      </div>
      <p className="t-body-lg mb-3" style={{ margin: 0 }}>
        {q.question}
      </p>
      {q.answer && (
        <div className="qa" style={{ borderColor: 'rgb(var(--brand))' }}>
          <div className="mb-1 flex items-center gap-2">
            <Avatar name="Host" size={32} />
            <span className="t-label-lg" style={{ fontSize: 12.5 }}>
              Event host
            </span>
            <Pill tone="ok">
              <Icon name="verified" size={11} />
              Answer
            </Pill>
          </div>
          <div className="t-body-md" style={{ color: 'rgb(var(--on-bg))' }}>
            {q.answer.body}
          </div>
        </div>
      )}
    </Card>
  );
}

// ===== Manager card (screen 46) =====

function ManagerCard({
  q,
  answering,
  onStartAnswer,
  onCancelAnswer,
  onSubmitAnswer,
  answerDraft,
  setAnswerDraft,
  onPin,
  onResolve,
  busy,
}: {
  q: QAItem;
  answering: boolean;
  onStartAnswer: () => void;
  onCancelAnswer: () => void;
  onSubmitAnswer: (body: string) => void;
  answerDraft: string;
  setAnswerDraft: (v: string) => void;
  onPin: () => void;
  onResolve: () => void;
  busy: boolean;
}) {
  const unanswered = !q.answer && !q.resolved;
  const askerName = q.authorName?.trim() || 'Community member';
  const cardStyle = unanswered
    ? {
        padding: 14,
        borderColor: 'rgb(var(--brand))',
        boxShadow: '0 0 0 3px rgb(var(--brand-wash))',
      }
    : { padding: 14 };

  return (
    <div className="card" style={cardStyle}>
      <div
        className="row"
        style={{ display: 'flex', gap: 9, marginBottom: 8, alignItems: 'center' }}
      >
        <Avatar name={askerName} src={q.authorPhotoUrl ?? undefined} size={32} />
        <div className="grow flex-1 min-w-0">
          <div className="t-label-lg truncate">{askerName}</div>
        </div>
        {unanswered && (
          <span
            className="status-chip"
            style={{
              background: 'rgb(var(--error-wash))',
              color: 'rgb(var(--error))',
            }}
          >
            Unanswered
          </span>
        )}
        {q.resolved && <span className="status-chip sc-pub">Resolved</span>}
        {q.pinned && !q.resolved && !unanswered && (
          <span
            className="status-chip"
            style={{
              background: 'rgb(var(--brand-wash))',
              color: 'rgb(var(--brand-ink))',
            }}
          >
            Pinned
          </span>
        )}
        <ManagerCardOverflow
          pinned={q.pinned}
          onPin={onPin}
        />
      </div>

      <div className="t-body-lg" style={{ marginBottom: q.answer ? 10 : 12 }}>
        {q.question}
      </div>

      {q.answer && (
        <div className="qa" style={{ borderColor: 'rgb(var(--brand))' }}>
          <div
            className="row"
            style={{ display: 'flex', gap: 7, marginBottom: 4, alignItems: 'center' }}
          >
            {q.pinned && (
              <span
                className="status-chip sc-pub"
                style={{ height: 19, fontSize: 10 }}
              >
                <Icon name="push_pin" size={11} />
                Pinned answer
              </span>
            )}
            {!q.pinned && (
              <span className="t-label-sm" style={{ margin: 0 }}>
                Answer
              </span>
            )}
          </div>
          <div className="t-body-md" style={{ color: 'rgb(var(--on-bg))' }}>
            {q.answer.body}
          </div>
        </div>
      )}

      {!answering && (
        <div
          className="row"
          style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
        >
          {!q.answer && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onStartAnswer}>
              <Icon name="reply" size={16} />
              Answer
            </button>
          )}
          {/* Mark resolved is only shown once an answer exists — resolving an
              unanswered question is a footgun (it hides the row from the Open
              filter without ever giving the asker a response). */}
          {q.answer && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onResolve}
              aria-pressed={q.resolved}
              style={
                q.resolved
                  ? {
                      background: 'rgb(var(--success-wash))',
                      color: 'rgb(var(--success))',
                      borderColor: 'rgb(var(--success-wash))',
                    }
                  : undefined
              }
            >
              <Icon name={q.resolved ? 'task_alt' : 'radio_button_unchecked'} size={16} />
              {q.resolved ? 'Resolved' : 'Mark resolved'}
            </button>
          )}
        </div>
      )}

      {answering && (
        <div style={{ marginTop: 12 }}>
          <div
            className="control"
            style={{
              padding: 10,
              background: 'rgb(var(--surface-2))',
              border: '1.5px solid rgb(var(--border-2))',
              borderRadius: 12,
              minHeight: 80,
              alignItems: 'stretch',
              display: 'flex',
            }}
          >
            <textarea
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="Host reply…"
              rows={3}
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelAnswer}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const t = answerDraft.trim();
                if (!t) return;
                onSubmitAnswer(t);
              }}
              disabled={!answerDraft.trim() || busy}
            >
              Post reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Per-card overflow menu — houses Pin/Unpin so it doesn't compete with Answer
// for visual weight. The unanswered cards already lead with a primary Answer
// button; pinning is a power-user follow-up the EM reaches for after the fact.
function ManagerCardOverflow({
  pinned,
  onPin,
}: {
  pinned: boolean;
  onPin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="ic-btn"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ width: 32, height: 32 }}
      >
        <Icon name="more_vert" size={18} />
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 30 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card"
            style={{
              position: 'absolute',
              top: 36,
              right: 0,
              zIndex: 31,
              padding: 6,
              minWidth: 160,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onPin();
                setOpen(false);
              }}
              className="t-body-lg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                textAlign: 'start',
                padding: '8px 10px',
                borderRadius: 8,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <Icon name="push_pin" size={16} />
              {pinned ? 'Unpin question' : 'Pin to top'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
