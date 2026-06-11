import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { Chip } from '../../components/Pill';
import { useInviteMember, useMyCommunities, type MembershipRole } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { extractError } from '../../lib/api';

type Mode = 'single' | 'bulk';

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function InviteMemberScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const myRole = mine?.find((m) => m.community.id === cid)?.membership.role;
  const isSubAdmin = myRole === 'subadmin';
  const community = mine?.find((m) => m.community.id === cid)?.community;
  const invite = useInviteMember(cid);
  const [mode, setMode] = useState<Mode>('single');
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState<MembershipRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  // After the backend creates each invitation it returns the single-use accept
  // token. Surface the full /invite/<token> URL so the admin can paste it into
  // WhatsApp / Slack / SMS without waiting for email delivery.
  const [sentLinks, setSentLinks] = useState<Array<{ email: string; url: string }>>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // PRD 05 §3: sub-admin can assign Event Manager but cannot promote to
  // Sub-Admin or Admin. Filter the chip list accordingly.
  const ROLE_OPTIONS = [
    { id: 'member' as const, label: 'Member' },
    { id: 'eventManager' as const, label: 'Event manager' },
    ...(isSubAdmin
      ? []
      : ([
          { id: 'subadmin' as const, label: 'Limited admin' },
          { id: 'admin' as const, label: 'Community admin' },
        ] as const)),
  ];

  function commitDraft(): void {
    const trimmed = draft.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setError(`"${trimmed}" doesn't look like an email`);
      return;
    }
    if (emails.includes(trimmed)) {
      setDraft('');
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setDraft('');
    setError(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  function removeEmail(idx: number): void {
    setEmails((prev) => prev.filter((_, i) => i !== idx));
  }

  function parseBulkSplit(raw: string): { valid: string[]; invalid: string[] } {
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const piece of raw.split(/[,\n;\s]+/)) {
      const s = piece.trim();
      if (!s) continue;
      if (!isValidEmail(s)) {
        invalid.push(s);
        continue;
      }
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      valid.push(s);
    }
    return { valid, invalid };
  }

  const { valid: bulkEmails, invalid: bulkInvalid } = useMemo(() => parseBulkSplit(draft), [draft]);
  const effectiveEmails = mode === 'single' ? emails : bulkEmails;

  async function send(): Promise<void> {
    // In single mode commitDraft() updates state asynchronously, so we must
    // build the list inline rather than rely on `emails`.
    let list: string[];
    if (mode === 'single') {
      const pending = draft.trim().replace(/,$/, '');
      const inline = pending && isValidEmail(pending) && !emails.includes(pending)
        ? [...emails, pending]
        : emails;
      if (pending && !isValidEmail(pending) && emails.length === 0) {
        setError(`"${pending}" doesn't look like an email`);
        return;
      }
      commitDraft();
      list = inline;
    } else {
      list = bulkEmails;
    }
    if (list.length === 0) {
      setError('Add at least one email');
      return;
    }
    setError(null);
    setSentCount(0);
    setSentLinks([]);
    let ok = 0;
    let firstErr: string | null = null;
    const links: Array<{ email: string; url: string }> = [];
    for (const email of list) {
      try {
        const r = await invite.mutateAsync({ email, role });
        ok += 1;
        setSentCount(ok);
        const token = (r as { data?: { data?: { token?: string } } })?.data?.data?.token;
        if (token) {
          links.push({ email, url: `${window.location.origin}/invite/${token}` });
        }
      } catch (err) {
        firstErr = firstErr ?? extractError(err).message;
      }
    }
    setSentLinks(links);
    if (firstErr && ok === 0) {
      setError(firstErr);
      return;
    }
    if (firstErr) {
      setError(`Sent ${ok} of ${list.length}. First error: ${firstErr}`);
      return;
    }
    // Keep admin on screen when we have copyable links; only nav back when
    // there's nothing useful to show.
    if (links.length === 0) {
      setTimeout(() => nav(-1), 1200);
    }
  }

  async function copyInviteLink(idx: number, url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const buttonLabel =
    effectiveEmails.length <= 1
      ? 'Send invite'
      : `Send ${effectiveEmails.length} invites`;
  const joinLink = community?.slug
    ? `commons.app/j/${community.slug.toUpperCase()}`
    : 'commons.app/j/—';

  return (
    <Screen>
      <AppBar back title="Invite members" />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <div className="seg mb-4">
          {(['single', 'bulk'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`s ${mode === m ? 'on' : ''}`}
            >
              {m === 'single' ? 'Single' : 'Bulk CSV'}
            </button>
          ))}
        </div>

        {mode === 'single' ? (
          <div className="field">
            <label>Email addresses</label>
            <div
              className="control"
              style={{
                height: 'auto',
                minHeight: 48,
                flexWrap: 'wrap',
                padding: '10px 12px',
                gap: 7,
                alignItems: 'center',
              }}
            >
              {emails.map((e, i) => (
                <span
                  key={`${e}-${i}`}
                  className="chip"
                  style={{
                    height: 28,
                    background: 'rgb(var(--brand-wash))',
                    color: 'rgb(var(--brand-ink))',
                    border: 'none',
                  }}
                  dir="ltr"
                >
                  {e}
                  <button
                    type="button"
                    onClick={() => removeEmail(i)}
                    className="grid place-items-center"
                    aria-label={`Remove ${e}`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={emails.length === 0 ? 'add email…' : ''}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={commitDraft}
                className="grow bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                style={{ minWidth: 120, flex: 1 }}
                dir="ltr"
              />
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              Press Enter or comma to add another
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Paste a CSV / list of emails</label>
            <div
              className="control"
              style={{ alignItems: 'stretch', padding: 12, minHeight: 110 }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={'maya@…\nrafi@…\n…'}
                className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                rows={5}
                dir="ltr"
              />
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              {bulkEmails.length} valid email{bulkEmails.length === 1 ? '' : 's'} parsed
              {bulkInvalid.length > 0 && (
                <span style={{ color: 'rgb(var(--error))', marginInlineStart: 8 }}>
                  · {bulkInvalid.length} skipped (invalid)
                </span>
              )}
            </div>
            {bulkInvalid.length > 0 && (
              <div
                className="t-body-md mt-2 p-2"
                style={{
                  background: 'rgb(var(--error-wash))',
                  color: 'rgb(var(--error))',
                  borderRadius: 8,
                  fontSize: 11,
                  margin: '8px 0 0',
                }}
                dir="ltr"
              >
                Skipped: {bulkInvalid.slice(0, 5).join(', ')}
                {bulkInvalid.length > 5 ? `, … (+${bulkInvalid.length - 5} more)` : ''}
              </div>
            )}
          </div>
        )}

        <div className="t-label-sm mb-2 mt-3 block">Invite as</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((r) => (
            <Chip key={r.id} selected={role === r.id} onClick={() => setRole(r.id)}>
              {r.label}
            </Chip>
          ))}
        </div>

        <div className="field">
          <label>
            Personal note <span className="muted" style={{ fontWeight: 400 }}>· optional</span>
          </label>
          <div className="control" style={{ height: 'auto', alignItems: 'flex-start', padding: 14 }}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="We'd love to have you join us…"
              className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Shareable join link fallback */}
        <div
          className="card row mt-1 flex items-center gap-2"
          style={{ padding: '12px 14px' }}
        >
          <Icon name="link" size={18} className="text-muted" />
          <span
            className="grow t-body-md"
            style={{
              margin: 0,
              fontFamily: "'DM Mono', ui-monospace, monospace",
              fontSize: 12,
              color: 'rgb(var(--on-bg))',
            }}
            dir="ltr"
          >
            {joinLink}
          </span>
          <button
            type="button"
            onClick={() => {
              if (navigator?.clipboard) navigator.clipboard.writeText(joinLink).catch(() => {});
            }}
            className="chip"
            style={{
              background: 'rgb(var(--surface-2))',
              borderColor: 'transparent',
              height: 28,
            }}
          >
            Copy
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">{error}</div>
        )}
        {sentCount > 0 && (
          <div className="mt-3 rounded-md bg-ok-wash px-3 py-2 text-sm text-ok">
            Sent {sentCount} invite{sentCount === 1 ? '' : 's'}
          </div>
        )}
        {sentLinks.length > 0 && (
          <div className="mt-3">
            <div className="t-caption-md mb-2 text-muted">
              Share these links directly (WhatsApp, SMS, etc.) — the email may take a minute.
            </div>
            <div className="flex flex-col gap-2">
              {sentLinks.map((l, i) => (
                <div
                  key={l.url}
                  className="card row flex items-center gap-2"
                  style={{ padding: '10px 12px' }}
                >
                  <Icon name="link" size={16} className="text-muted" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="t-caption-md text-muted" dir="ltr">
                      {l.email}
                    </div>
                    <div
                      className="t-body-md"
                      style={{
                        fontFamily: "'DM Mono', ui-monospace, monospace",
                        fontSize: 11,
                        color: 'rgb(var(--on-bg))',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      dir="ltr"
                    >
                      {l.url}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(i, l.url)}
                    className="chip"
                    style={{
                      background: 'rgb(var(--surface-2))',
                      borderColor: 'transparent',
                      height: 28,
                    }}
                  >
                    {copiedIdx === i ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-4">
          <AppButton
            onClick={send}
            loading={invite.isPending}
            disabled={effectiveEmails.length === 0 && !draft.trim()}
          >
            {buttonLabel}
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}
