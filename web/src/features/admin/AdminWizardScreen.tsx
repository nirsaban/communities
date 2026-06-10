import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { LoadingDots } from '../../components/LoadingDots';
import { api, extractError } from '../../lib/api';
import { communityContext } from '../../lib/community-context';
import {
  useInviteMember,
  useMyCommunities,
  useOnboardCommunity,
  useUpdateCommunity,
} from '../../lib/queries';

type StepId = 'basics' | 'branding' | 'privacy' | 'experience' | 'firstEvent' | 'firstInvites';

const STEPS: Array<{ id: StepId; label: string; icon: string; headline: string }> = [
  { id: 'basics', label: 'Basics', icon: 'info', headline: 'Name your\ncommunity' },
  { id: 'branding', label: 'Branding', icon: 'palette', headline: 'Make it\nyours' },
  { id: 'privacy', label: 'Privacy', icon: 'lock', headline: 'Who can join?' },
  { id: 'experience', label: 'Experience', icon: 'auto_awesome', headline: 'First\nimpressions' },
  { id: 'firstEvent', label: 'First event', icon: 'event', headline: 'Give them a\nreason to show' },
  { id: 'firstInvites', label: 'Invite', icon: 'group_add', headline: 'Bring your\npeople in' },
];

type Category = 'religious' | 'educational' | 'professional' | 'hobby' | 'other';
type Privacy = 'public' | 'invite_only' | 'application';

const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: 'religious', label: 'Faith & study' },
  { id: 'educational', label: 'Educational' },
  { id: 'professional', label: 'Professional' },
  { id: 'hobby', label: 'Hobby' },
  { id: 'other', label: 'Other' },
];

const PRIVACY: Array<{ id: Privacy; label: string; hint: string; icon: string }> = [
  { id: 'public', label: 'Public', hint: 'Anyone can find & join instantly.', icon: 'public' },
  { id: 'application', label: 'Request to join', hint: 'Admins approve each new member.', icon: 'how_to_reg' },
  { id: 'invite_only', label: 'Invite only', hint: 'Hidden from directory; link & code only.', icon: 'lock' },
];

export function AdminWizardScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const onboard = useOnboardCommunity(cid);
  const update = useUpdateCommunity(cid);
  const invite = useInviteMember(cid);

  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: basics
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('other');

  // Step 2: branding
  const [logoUrl, setLogoUrl] = useState('');
  const [primary, setPrimary] = useState('#FF7A55');
  const [accent, setAccent] = useState('#FFB199');

  // Step 3: privacy
  const [privacy, setPrivacy] = useState<Privacy>('public');

  // Step 4: experience
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [rules, setRules] = useState('');

  // Step 6: invites
  const [inviteEmailDraft, setInviteEmailDraft] = useState('');
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [sentEmails, setSentEmails] = useState<string[]>([]);

  useEffect(() => {
    if (!cid) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/communities/${cid}`);
        if (!alive) return;
        const c = r.data?.data ?? {};
        setName(String(c.name ?? ''));
        setDescription(String(c.description ?? ''));
        setCategory((c.category as Category) ?? 'other');
        setPrivacy((c.privacy as Privacy) ?? 'public');
        setLogoUrl(String(c.logoUrl ?? ''));
        const settings = (c.settings as {
          welcomeMessage?: string;
          rules?: string;
          branding?: { primaryColor?: string; accentColor?: string };
        }) ?? {};
        setWelcomeMessage(String(settings.welcomeMessage ?? ''));
        setRules(String(settings.rules ?? ''));
        if (settings.branding?.primaryColor) setPrimary(settings.branding.primaryColor);
        if (settings.branding?.accentColor) setAccent(settings.branding.accentColor);
        // Resume on the next unfinished step.
        const completed = (c.onboarding as { completedStep?: StepId }) ?? {};
        if (completed.completedStep) {
          const i = STEPS.findIndex((s) => s.id === completed.completedStep);
          if (i >= 0 && i < STEPS.length - 1) setStepIdx(i + 1);
        }
      } catch (err) {
        setError(extractError(err).message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cid]);

  const step = STEPS[stepIdx];

  async function saveStep(): Promise<boolean> {
    setError(null);
    try {
      if (step.id === 'basics') {
        await update.mutateAsync({
          name: name.trim() || undefined,
          description: description.trim(),
          category,
        });
      } else if (step.id === 'branding') {
        await update.mutateAsync({
          logoUrl: logoUrl.trim() || undefined,
          settings: { branding: { primaryColor: primary, accentColor: accent } },
        });
      } else if (step.id === 'privacy') {
        await update.mutateAsync({ privacy });
      } else if (step.id === 'experience') {
        await update.mutateAsync({
          settings: { welcomeMessage: welcomeMessage.trim(), rules: rules.trim() },
        });
      }
      await onboard.mutateAsync({ completedStep: step.id });
      return true;
    } catch (err) {
      setError(extractError(err).message);
      return false;
    }
  }

  async function next(): Promise<void> {
    // On the final invites step, fold any uncommitted typed email into the
    // list and send it so the user doesn't silently lose their last entry
    // when they tap Finish without first tapping Send.
    if (step.id === 'firstInvites') {
      const trimmed = inviteEmailDraft.trim();
      if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !inviteList.includes(trimmed)) {
        // Capture so we don't depend on async state updates.
        const finalList = [...inviteList, trimmed];
        setInviteList(finalList);
        setInviteEmailDraft('');
        try {
          for (const email of finalList) {
            if (!sentEmails.includes(email)) await invite.mutateAsync({ email, role: 'member' });
          }
          setSentEmails((prev) => [...prev, ...finalList.filter((e) => !prev.includes(e))]);
          setInviteList([]);
        } catch (err) {
          setError(extractError(err).message);
          return;
        }
      }
    }
    const ok = await saveStep();
    if (!ok) return;
    if (stepIdx === STEPS.length - 1) {
      nav('/admin');
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function back(): void {
    if (stepIdx === 0) nav(-1);
    else setStepIdx((i) => i - 1);
  }

  function addInvite(): void {
    const e = inviteEmailDraft.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (inviteList.includes(e)) return;
    setInviteList((prev) => [...prev, e]);
    setInviteEmailDraft('');
  }

  async function sendInvites(): Promise<void> {
    if (inviteList.length === 0) return;
    setError(null);
    try {
      for (const email of inviteList) {
        await invite.mutateAsync({ email, role: 'member' });
        setSentEmails((prev) => [...prev, email]);
      }
      setInviteList([]);
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  if (loading) {
    return (
      <Screen>
        <AppBar back title="Set up your community" />
        <div className="flex flex-1 items-center justify-center">
          <LoadingDots />
        </div>
      </Screen>
    );
  }

  const isOptional = step.id === 'firstEvent' || step.id === 'firstInvites';

  return (
    <Screen>
      <AppBar
        back
        onBack={back}
        showTitle={false}
        trailing={
          <span className="t-label-sm pe-3">
            Step {stepIdx + 1} of {STEPS.length} · {step.label}
            {isOptional && (
              <span style={{ color: 'rgb(var(--brand-ink))', marginInlineStart: 6 }}>Optional</span>
            )}
          </span>
        }
      />

      <div className="px-5 pt-2">
        <div className="flex gap-1 mb-4">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 9,
                background:
                  i <= stepIdx ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
              }}
            />
          ))}
        </div>
        <h1 className="t-display-md" style={{ margin: '2px 0 20px', whiteSpace: 'pre-line' }}>
          {step.headline}
        </h1>
      </div>

      <main className="flex-1 px-5 pb-6">
        {error && (
          <div className="t-body-md mb-3" style={{ color: 'rgb(var(--error))' }}>
            {error}
          </div>
        )}

        {step.id === 'basics' && (
          <div className="space-y-3">
            <Input label="Community name" value={name} onChange={(e) => setName(e.target.value)} leadingIcon="groups" />
            <div className="field">
              <label>Short description</label>
              <div className="control" style={{ alignItems: 'stretch', padding: 12, minHeight: 100 }}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about?"
                  className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                  rows={4}
                />
              </div>
              <div className="hint">{description.length} / 160</div>
            </div>
            <div className="field">
              <label>Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className="chip"
                    style={{
                      background: category === c.id ? 'rgb(var(--brand-wash))' : 'rgb(var(--surface-2))',
                      color: category === c.id ? 'rgb(var(--brand-ink))' : 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                      height: 34,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step.id === 'branding' && (
          <div className="space-y-3">
            <Card className="p-4">
              <div className="t-label-sm mb-2">Preview</div>
              <div
                style={{
                  borderRadius: 14,
                  padding: 16,
                  background: primary,
                  color: '#fff',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <span
                      className="grid place-items-center"
                      style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)' }}
                    >
                      <Icon name="diversity_3" size={20} />
                    </span>
                  )}
                  <div style={{ fontWeight: 600 }}>{name || 'Community name'}</div>
                </div>
                <button
                  style={{
                    background: accent,
                    color: '#111',
                    border: 0,
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Button
                </button>
              </div>
            </Card>
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              leadingIcon="image"
              dir="ltr"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label>Brand color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    style={{ width: 44, height: 44, border: 0, padding: 0, borderRadius: 8 }}
                  />
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="field">
                <label>Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    style={{ width: 44, height: 44, border: 0, padding: 0, borderRadius: 8 }}
                  />
                  <Input value={accent} onChange={(e) => setAccent(e.target.value)} dir="ltr" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step.id === 'privacy' && (
          <div className="space-y-2">
            {PRIVACY.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrivacy(p.id)}
                className="card flex w-full items-start gap-3 p-3 text-start"
                style={{
                  border: privacy === p.id ? '2px solid rgb(var(--brand))' : '1px solid rgb(var(--border))',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border:
                      privacy === p.id
                        ? '6px solid rgb(var(--brand))'
                        : '2px solid rgb(var(--border-2))',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div className="flex-1">
                  <div className="t-label-lg">{p.label}</div>
                  <div className="t-body-md" style={{ margin: 0 }}>
                    {p.hint}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step.id === 'experience' && (
          <div className="space-y-3">
            <div className="field">
              <label>Welcome message</label>
              <div className="control" style={{ alignItems: 'stretch', padding: 12, minHeight: 80 }}>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Welcome! Glad you're here…"
                  className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="field">
              <label>Guidelines</label>
              <div className="control" style={{ alignItems: 'stretch', padding: 12, minHeight: 140 }}>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder={'1. Be kind & respectful\n2. Keep it relevant\n3. Show up for RSVPs'}
                  className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none resize-none"
                  rows={5}
                />
              </div>
            </div>
          </div>
        )}

        {step.id === 'firstEvent' && (
          <Card className="p-4 text-center">
            <span
              className="grid place-items-center mx-auto mb-3"
              style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgb(var(--brand-wash))', color: 'rgb(var(--brand-ink))' }}
            >
              <Icon name="event_available" size={36} />
            </span>
            <h3 className="t-title-md mb-1">Get the first event on the calendar</h3>
            <p className="t-body-md mb-4">
              Communities with an event in week one keep 3× more members.
            </p>
            <div className="space-y-2">
              <AppButton
                onClick={async () => {
                  // Mark the step complete BEFORE leaving so the user is not
                  // bounced back into the wizard on next login. If marking
                  // fails we still navigate — the worst case is they re-see
                  // this step, never the previous ones.
                  await saveStep();
                  nav('/admin/events/new');
                }}
              >
                Create event & continue
              </AppButton>
              <AppButton variant="ghost" onClick={next}>
                Skip for now
              </AppButton>
            </div>
          </Card>
        )}

        {step.id === 'firstInvites' && (
          <div className="space-y-3">
            <p className="t-body-md" style={{ margin: 0 }}>
              Invite 3–5 friends to seed your community. You can always add more later.
            </p>
            <div className="flex gap-2 items-center">
              <Input
                value={inviteEmailDraft}
                onChange={(e) => setInviteEmailDraft(e.target.value)}
                placeholder="email@example.com"
                leadingIcon="mail"
                dir="ltr"
                type="email"
                className="flex-1"
              />
              <button
                onClick={addInvite}
                className="ic-btn soft"
                style={{
                  background: 'rgb(var(--brand))',
                  color: '#fff',
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                }}
                aria-label="Add"
              >
                <Icon name="add" />
              </button>
            </div>
            {inviteList.length > 0 && (
              <div className="flex flex-col gap-1">
                {inviteList.map((e) => (
                  <div key={e} className="list-row flex items-center gap-3">
                    <Icon name="mail" className="text-brand" />
                    <span className="t-label-lg flex-1 truncate" dir="ltr">
                      {e}
                    </span>
                    <button
                      onClick={() => setInviteList((prev) => prev.filter((x) => x !== e))}
                      className="ic-btn"
                      aria-label="Remove"
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sentEmails.length > 0 && (
              <Card className="p-3" style={{ background: 'rgb(var(--success-wash))' }}>
                <div className="t-label-sm mb-1">Sent</div>
                {sentEmails.map((e) => (
                  <div key={e} className="t-body-md" style={{ margin: 0 }} dir="ltr">
                    <Icon name="check_circle" size={12} className="text-success" /> {e}
                  </div>
                ))}
              </Card>
            )}
            <AppButton
              variant="secondary"
              onClick={sendInvites}
              loading={invite.isPending}
              disabled={inviteList.length === 0 || invite.isPending}
            >
              Send {inviteList.length} {inviteList.length === 1 ? 'invite' : 'invites'}
            </AppButton>
          </div>
        )}
      </main>
      <footer
        className="safe-bottom border-t px-4 py-3"
        style={{ background: 'rgb(var(--surface))', borderColor: 'rgb(var(--border))' }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <AppButton variant="secondary" onClick={back}>
            {stepIdx === 0 ? 'Exit' : 'Back'}
          </AppButton>
          <AppButton variant="primary" onClick={next} loading={onboard.isPending || update.isPending}>
            {stepIdx === STEPS.length - 1 ? 'Finish setup' : 'Continue'}
          </AppButton>
        </div>
      </footer>
    </Screen>
  );
}
