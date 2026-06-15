import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { Input } from '../../components/Input';
import { useToast } from '../../components/Toast';
import { useCreateInitiative, useMyCommunities } from '../../lib/queries';
import { communityContext } from '../../lib/community-context';
import { api, extractError } from '../../lib/api';

type Category = 'event' | 'volunteer' | 'product' | 'social' | 'other';

const CATEGORY_OPTIONS: Array<{ id: Category; label: string; icon: string }> = [
  { id: 'event', label: 'Event', icon: 'event' },
  { id: 'volunteer', label: 'Volunteering', icon: 'volunteer_activism' },
  { id: 'product', label: 'Product', icon: 'inventory_2' },
  { id: 'social', label: 'Social', icon: 'groups' },
  { id: 'other', label: 'Other', icon: 'star' },
];

const VIBE_SUGGESTIONS = [
  'family-friendly',
  'outdoors',
  'inclusive',
  'fun',
  'creative',
  'educational',
  'gives-back',
];

export function NewInitiativeScreen() {
  const nav = useNavigate();
  const ctx = communityContext();
  const { data: mine } = useMyCommunities();
  const cid = ctx.currentCommunityId ?? mine?.[0]?.community.id;
  const create = useCreateInitiative(cid);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('event');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState('');
  const [membersNeeded, setMembersNeeded] = useState('');
  const [budgetNote, setBudgetNote] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string): void {
    const v = raw.trim().toLowerCase().replace(/^#/, '');
    if (!v) return;
    if (tags.includes(v)) return;
    if (tags.length >= 20) return;
    setTags((cur) => [...cur, v]);
    setTagInput('');
  }
  function removeTag(t: string): void {
    setTags((cur) => cur.filter((x) => x !== t));
  }

  async function onCoverPicked(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Reuses the profile-photo endpoint which fronts the StorageService.
      // Backend stores any uploaded image under the "profiles" folder for now —
      // a follow-up can move initiative covers to their own folder if needed.
      const r = await api.post('/auth/me/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string | undefined = r.data?.data?.photo?.url ?? r.data?.data?.user?.photoUrl;
      if (url) setCoverImageUrl(url);
    } catch (err) {
      setError(extractError(err).message);
    } finally {
      setUploadingCover(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function buildPayload(status: 'draft' | 'submitted') {
    return {
      title: title.trim(),
      description: description.trim(),
      category,
      coverImageUrl: coverImageUrl.trim() || undefined,
      targetDate: targetDate || undefined,
      goal: goal.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      membersNeeded: membersNeeded ? Math.max(0, Math.floor(Number(membersNeeded))) : undefined,
      budgetNote: budgetNote.trim() || undefined,
      rulesAccepted,
      status,
    };
  }

  async function save(status: 'draft' | 'submitted'): Promise<void> {
    setError(null);
    if (!title.trim()) {
      setError('Add a title.');
      return;
    }
    if (status === 'submitted' && !rulesAccepted) {
      setError('Please acknowledge the community rules before submitting.');
      return;
    }
    try {
      await create.mutateAsync(buildPayload(status));
      toast.success(
        status === 'submitted'
          ? 'Initiative submitted for review'
          : 'Saved as draft',
      );
      nav('/initiatives');
    } catch (err) {
      setError(extractError(err).message);
    }
  }

  const valid = title.trim().length >= 2;

  return (
    <Screen>
      <AppBar
        title="New initiative"
        leading={
          <button onClick={() => nav(-1)} className="ic-btn" aria-label="Close">
            <Icon name="close" />
          </button>
        }
      />
      <main className="flex flex-1 flex-col px-5 pb-6">
        <Section title="Cover">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="imgph w-full"
            style={{
              height: 132,
              borderRadius: 14,
              position: 'relative',
              backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: coverImageUrl ? 'none' : undefined,
              cursor: 'pointer',
            }}
          >
            {!coverImageUrl && (
              <span className="lbl">
                {uploadingCover ? 'Uploading…' : 'Tap to upload a cover image'}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onCoverPicked}
            style={{ display: 'none' }}
          />
        </Section>

        <Section title="Basics">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            leadingIcon="lightbulb"
            placeholder="What's the idea?"
            required
          />

          <div className="field">
            <label>Category</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORY_OPTIONS.map((c) => {
                const on = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className="chip"
                    style={{
                      background: on ? 'rgb(var(--brand))' : 'rgb(var(--surface-2))',
                      color: on ? '#fff' : 'rgb(var(--on-bg))',
                      borderColor: 'transparent',
                      height: 34,
                      padding: '0 12px',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon name={c.icon} size={15} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>What's the proposal?</label>
            <div
              className="control"
              style={{ height: 'auto', alignItems: 'flex-start', padding: 14 }}
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to do and why it matters"
                rows={5}
                className="grow w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                style={{ resize: 'none', minHeight: 100 }}
                maxLength={5000}
              />
            </div>
            <div className="hint">{description.length}/5000</div>
          </div>
        </Section>

        <Section title="Goal & vibe">
          <Input
            label="Goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            leadingIcon="flag"
            placeholder='e.g. "Collect 200 books for the school library"'
          />

          <div className="field">
            <label>Vibe / tags</label>
            <div className="control" style={{ flexWrap: 'wrap', gap: 6 }}>
              {tags.map((t) => (
                <span
                  key={t}
                  className="chip"
                  style={{
                    background: 'rgb(var(--brand-wash))',
                    color: 'rgb(var(--brand-ink))',
                    borderColor: 'transparent',
                    height: 28,
                    padding: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: 'inherit',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder="add a tag, then Enter"
                className="grow bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                style={{ minWidth: 120 }}
              />
            </div>
            <div className="hint">
              Try:{' '}
              {VIBE_SUGGESTIONS.filter((v) => !tags.includes(v))
                .slice(0, 4)
                .map((v, idx, arr) => (
                  <span key={v}>
                    <button
                      type="button"
                      onClick={() => addTag(v)}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: 'rgb(var(--brand-ink))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: 0,
                      }}
                    >
                      #{v}
                    </button>
                    {idx < arr.length - 1 ? ' · ' : ''}
                  </span>
                ))}
            </div>
          </div>
        </Section>

        <Section title="Logistics">
          <Input
            label="Target date / time"
            type="datetime-local"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            leadingIcon="event"
          />
          <Input
            label="Members or contributors needed"
            type="number"
            inputMode="numeric"
            value={membersNeeded}
            onChange={(e) => setMembersNeeded(e.target.value)}
            leadingIcon="groups"
            placeholder="e.g. 8"
          />
          <Input
            label="Price / budget note (optional)"
            value={budgetNote}
            onChange={(e) => setBudgetNote(e.target.value)}
            leadingIcon="payments"
            placeholder='Just a note — e.g. "free to attend", "$5 entry"'
          />
          <p className="t-body-md" style={{ margin: '-6px 0 0', fontSize: 11.5 }}>
            Initiative payments aren't enabled yet — this is a description only.
          </p>
        </Section>

        <Section title="Community rules">
          <label
            className="card flex items-start gap-3 p-3 cursor-pointer"
            style={{ background: 'rgb(var(--surface-2))', borderStyle: 'dashed' }}
          >
            <button
              type="button"
              onClick={() => setRulesAccepted((v) => !v)}
              className="mt-0.5 grid h-[22px] w-[22px] flex-shrink-0 place-items-center"
              style={{
                borderRadius: 6,
                background: rulesAccepted ? 'rgb(var(--brand))' : 'transparent',
                border: rulesAccepted ? 'none' : '1.5px solid rgb(var(--border-2))',
              }}
              aria-pressed={rulesAccepted}
              aria-label="Acknowledge rules"
            >
              {rulesAccepted && <Icon name="check" size={14} className="!text-white" />}
            </button>
            <div className="flex-1">
              <div className="t-label-lg" style={{ fontSize: 13.5 }}>
                I've read the community's rules
              </div>
              <p className="t-body-md" style={{ margin: '2px 0 0', fontSize: 11.5 }}>
                Initiatives go through admin review before they go live —
                keeping them on-rules speeds that up.
              </p>
            </div>
          </label>
        </Section>

        {error && (
          <div className="mt-3 rounded-md bg-bad-wash px-3 py-2 text-sm text-bad">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <AppButton
            variant="secondary"
            onClick={() => save('draft')}
            loading={create.isPending}
            disabled={!valid || create.isPending}
          >
            Save draft
          </AppButton>
          <AppButton
            variant="primary"
            onClick={() => save('submitted')}
            loading={create.isPending}
            disabled={!valid || !rulesAccepted || create.isPending}
          >
            Submit for review
          </AppButton>
        </div>
      </main>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="t-label-lg" style={{ fontSize: 13, marginBottom: 8 }}>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
