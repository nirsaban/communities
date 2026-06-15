import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Chip } from '../../components/Pill';
import { Input } from '../../components/Input';
import { ProgressBar } from '../../components/ProgressBar';
import { t } from '../../i18n';

// PRD 10 §2.2 step 6 — comprehensive, world-spanning taxonomy grouped by
// category. The chip labels are the canonical taxonomy tokens persisted to
// `users.interests` and matched against `Community.tags` for the "Communities
// for you" recommender. Keep names short, language-neutral, and stable —
// editing a label here is a data migration.
const TAXONOMY: ReadonlyArray<{ category: string; items: string[] }> = [
  {
    category: 'Sports & fitness',
    items: [
      'Running', 'Cycling', 'Yoga', 'Pilates', 'Strength training', 'CrossFit',
      'Climbing', 'Hiking', 'Swimming', 'Surfing', 'Soccer', 'Basketball',
      'Tennis', 'Padel', 'Martial arts', 'Boxing', 'Skiing', 'Snowboarding',
    ],
  },
  {
    category: 'Arts & crafts',
    items: [
      'Painting', 'Drawing', 'Photography', 'Ceramics', 'Sculpture',
      'Calligraphy', 'Knitting', 'Sewing', 'Woodworking', 'Jewelry',
      'Graphic design', 'Illustration', 'Film & video', 'Theatre',
    ],
  },
  {
    category: 'Music',
    items: [
      'Live concerts', 'DJing', 'Guitar', 'Piano', 'Singing', 'Songwriting',
      'Electronic', 'Jazz', 'Hip-hop', 'Classical', 'World music',
    ],
  },
  {
    category: 'Tech & startups',
    items: [
      'Software engineering', 'AI & ML', 'Data science', 'Cybersecurity',
      'Web3 & crypto', 'DevOps', 'Mobile dev', 'Product management',
      'UX/UI design', 'Indie hacking', 'Founders & VC', 'No-code',
    ],
  },
  {
    category: 'Business & career',
    items: [
      'Entrepreneurship', 'Marketing', 'Sales', 'Finance & investing',
      'Real estate', 'Leadership', 'Career growth', 'Public speaking',
      'Networking', 'Freelancing', 'Consulting',
    ],
  },
  {
    category: 'Science & learning',
    items: [
      'Astronomy', 'Physics', 'Biology', 'Chemistry', 'Maths',
      'History', 'Philosophy', 'Psychology', 'Languages', 'Book club',
    ],
  },
  {
    category: 'Faith & spirituality',
    items: [
      'Jewish life', 'Christian', 'Muslim', 'Buddhist', 'Hindu',
      'Meditation', 'Mindfulness', 'Torah study', 'Bible study',
      'Interfaith dialogue',
    ],
  },
  {
    category: 'Lifestyle',
    items: [
      'Food & cooking', 'Coffee', 'Wine & spirits', 'Travel', 'Camping',
      'Pets', 'Fashion', 'Beauty', 'Sustainability', 'Minimalism', 'Home & garden',
    ],
  },
  {
    category: 'Family & relationships',
    items: [
      'Parenting', 'New parents', 'Single life', 'LGBTQ+', 'Dating',
      'Couples', 'Friendship', 'Senior life',
    ],
  },
  {
    category: 'Health & wellness',
    items: [
      'Mental health', 'Nutrition', 'Sleep & recovery', 'Therapy & support',
      'Plant-based', 'Chronic illness',
    ],
  },
  {
    category: 'Community & impact',
    items: [
      'Volunteering', 'Activism', 'Climate', 'Animal welfare',
      'Local politics', 'Mutual aid', 'Education',
    ],
  },
  {
    category: 'Games & hobbies',
    items: [
      'Board games', 'Tabletop RPG', 'Video games', 'Esports',
      'Chess', 'Trivia', 'Collecting', 'Gardening', 'Birding', 'Astrology',
    ],
  },
];

const MIN_PICKS = 3;

// Bottom CTA bar height — body padding-bottom matches it so the last chips
// aren't hidden under the floating button.
const CTA_HEIGHT_PX = 76;

export function InterestsSelectorScreen() {
  const nav = useNavigate();
  const auth = useAuth();
  const [selected, setSelected] = useState<string[]>(auth.user?.interests ?? []);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const n = selected.length;
  const ready = n >= MIN_PICKS;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TAXONOMY;
    return TAXONOMY.map((g) => ({
      category: g.category,
      items: g.items.filter(
        (i) =>
          i.toLowerCase().includes(needle) ||
          g.category.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  function toggle(name: string): void {
    setSelected((cur) =>
      cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name],
    );
  }

  async function onContinue(): Promise<void> {
    if (!ready) return;
    setLoading(true);
    try {
      const r = await api.patch('/auth/me', { interests: selected });
      const updated = r.data?.data?.user ?? { ...auth.user!, interests: selected };
      auth.setUser(updated);
      nav('/home', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  const progress = Math.min(100, Math.round((n / MIN_PICKS) * 100));

  return (
    <Screen>
      <AppBar back showTitle={false} />
      {/* Single body column constrained to a readable width on desktop. The
          page scrolls naturally — no nested overflow-y here — so the search
          bar can sit BELOW the AppBar via top: <appbar-height> instead of
          competing with it. Bottom padding makes room for the fixed CTA. */}
      <main
        className="content-sm px-5"
        style={{ paddingBottom: CTA_HEIGHT_PX + 16 }}
      >
        <ProgressBar value={50} />
        <p className="t-label-sm mt-2">{t.onboarding.stepOfN(2, 2)}</p>
        <h1 className="t-display-md mt-2">{t.onboarding.interestsTitle}</h1>
        <p className="t-body-md mt-3">{t.onboarding.interestsBody}</p>

        {/* Sticky search + progress strip — anchored just under the AppBar
            (which is sticky top: 0 at ~58px tall). Wrap stays inside the
            constrained main, so it never sprawls on desktop. */}
        <div
          className="sticky z-10 pb-2 pt-2"
          style={{
            top: 58,
            background: 'rgb(var(--bg))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search interests"
            leadingIcon="search"
            dir="ltr"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="t-label-sm">
              {n}/{MIN_PICKS} selected · pick at least {MIN_PICKS}
            </span>
            <div
              aria-hidden
              className="h-1 w-24 overflow-hidden rounded-full"
              style={{ background: 'rgb(var(--border-2))' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'rgb(var(--brand))',
                  transition: 'width 200ms ease',
                }}
              />
            </div>
          </div>
        </div>

        {visible.length === 0 && (
          <p
            className="t-body-md mt-6 text-center"
            style={{ color: 'rgb(var(--muted))' }}
          >
            No interests match "{q}".
          </p>
        )}

        {visible.map((group) => (
          <section key={group.category} className="mt-5">
            <h2
              className="t-label-lg"
              style={{ fontSize: 13, marginBottom: 8 }}
            >
              {group.category}
            </h2>
            <div className="flex flex-wrap gap-2">
              {group.items.map((name) => (
                <Chip
                  key={name}
                  selected={selected.includes(name)}
                  onClick={() => toggle(name)}
                >
                  {name}
                </Chip>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Fixed CTA bar — pinned to viewport so it stays in reach no matter
          how far the user has scrolled. Inner div re-applies the content-sm
          width cap so the button lines up with the form on desktop. */}
      <div
        className="fixed inset-x-0 z-20"
        style={{
          bottom: 0,
          background: 'rgb(var(--bg))',
          borderTop: '1px solid rgb(var(--border))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="content-sm px-5 py-3">
          <AppButton
            disabled={!ready || loading}
            loading={loading}
            onClick={onContinue}
          >
            {ready
              ? `${t.app.continue} · ${n} selected`
              : t.onboarding.continueWithCount(n)}
          </AppButton>
        </div>
      </div>
    </Screen>
  );
}
