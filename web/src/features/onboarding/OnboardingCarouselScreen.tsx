import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { Icon } from '../../components/Icon';
import { t } from '../../i18n';

// §3.1 — richer welcome hero. The page now:
//   • randomizes a parallax illustration on each load (3 variants)
//   • drives a subtle 3D tilt on the illustration so it tracks the cursor
//   • expands marketing copy with multiple value-prop sections below the hero
//
// The carousel slides (t.onboarding.slides) are still the lead but the page
// keeps scrolling past them into explanatory sections so first-time visitors
// see the full pitch.

type Illustration = 'orbit' | 'mosaic' | 'spark';

const SCENES: Illustration[] = ['orbit', 'mosaic', 'spark'];

function pickScene(): Illustration {
  // Math.random is fine for a UI variant — no replay or determinism needed.
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  return SCENES[Math.floor(Math.random() * SCENES.length)];
}

export function OnboardingCarouselScreen() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [scene, setScene] = useState<Illustration>(() => pickScene());
  const slides = t.onboarding.slides;
  const last = i === slides.length - 1;
  const heroRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  // Re-randomize on mount so each visit feels alive. Stays stable inside the
  // session so the user isn't disoriented mid-flow.
  useEffect(() => {
    setScene(pickScene());
  }, []);

  function onPointerMove(e: React.PointerEvent): void {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    // Clamp to ±10° — enough to feel 3D, not enough to feel queasy.
    setTilt({ ry: dx * 12, rx: -dy * 10 });
  }

  function next(): void {
    if (last) nav('/signup');
    else setI((v) => v + 1);
  }

  return (
    <Screen>
      <AppBar
        showTitle={false}
        trailing={
          <button
            onClick={() => nav('/signup')}
            className="t-label-lg pe-3"
            style={{ color: 'rgb(var(--muted))' }}
          >
            {t.app.skip}
          </button>
        }
      />

      <div
        ref={heroRef}
        className="mx-5 mt-1"
        style={{
          height: 320,
          borderRadius: 22,
          background:
            'linear-gradient(135deg, rgb(var(--brand-wash)) 0%, rgba(var(--brand), 0.18) 100%)',
          overflow: 'hidden',
          position: 'relative',
          perspective: 900,
          touchAction: 'none',
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setTilt({ rx: 0, ry: 0 })}
      >
        <HeroScene
          scene={scene}
          rx={tilt.rx}
          ry={tilt.ry}
        />
      </div>

      <main className="flex flex-1 flex-col px-5 pt-7 pb-10">
        <h1 className="t-display-lg mb-2.5">{slides[i].title}</h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))' }}>
          {slides[i].body}
        </p>

        <div className="mt-6 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              style={{
                height: 7,
                width: idx === i ? 28 : 7,
                borderRadius: 9,
                background: idx === i ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
                transition: 'all 0.3s',
                border: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <div className="mt-6">
          <AppButton onClick={next}>
            {last ? t.auth.register : t.app.continue}
            <span className="msr">arrow_forward</span>
          </AppButton>
          <button
            onClick={() => nav('/login')}
            className="mt-4 block w-full text-center text-sm"
            style={{ color: 'rgb(var(--brand-ink))' }}
          >
            {t.auth.haveAccount}
          </button>
        </div>

        {/* Expanded marketing sections — scroll below the fold for the
            full pitch. Helps newcomers understand the product before signup. */}
        <Story />
      </main>
    </Screen>
  );
}

function Story() {
  const blocks: Array<{ icon: string; title: string; body: string }> = useMemo(
    () => [
      {
        icon: 'diversity_3',
        title: 'Communities that feel local',
        body: "Find groups around your faith, hobbies, neighbourhood, sport, or industry. Join with a tap — admins keep the room healthy.",
      },
      {
        icon: 'event_available',
        title: 'Events without the WhatsApp chaos',
        body: 'RSVP in two taps, see capacity in real time, get your ticket on your phone, and tap into the Q&A while you wait.',
      },
      {
        icon: 'forum',
        title: 'Conversations that don’t scroll away',
        body: 'Pinned announcements, real Q&A, member posts and initiatives stay searchable and structured — not lost in a 2,000-message thread.',
      },
      {
        icon: 'lightbulb',
        title: 'Member-led initiatives',
        body: 'Have an idea? Propose it, gather supporters, get the admin’s nod, and ship it together.',
      },
      {
        icon: 'workspace_premium',
        title: 'Optional paid memberships',
        body: 'Communities can offer premium perks (free events, members-only content). One price, no haggle.',
      },
    ],
    [],
  );
  return (
    <section className="mt-10">
      <h2 className="t-display-md mb-2">Why members stay</h2>
      <p className="t-body-md mb-5">
        Communities is built for the kinds of groups WhatsApp and Facebook can’t
        hold any more.
      </p>
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.title} className="card flex items-start gap-3 p-3.5">
            <span
              className="grid place-items-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgb(var(--brand-wash))',
                color: 'rgb(var(--brand-ink))',
                flexShrink: 0,
              }}
            >
              <Icon name={b.icon} size={22} />
            </span>
            <div>
              <div className="t-title-md" style={{ fontSize: 15 }}>
                {b.title}
              </div>
              <p
                className="t-body-md"
                style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.5 }}
              >
                {b.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===== Hero scenes =====
// Three illustrated variants — randomized on load and tilted in 3D as the
// pointer moves so the page feels alive rather than static.

function HeroScene({
  scene,
  rx,
  ry,
}: {
  scene: Illustration;
  rx: number;
  ry: number;
}) {
  const transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  if (scene === 'orbit') return <OrbitScene transform={transform} />;
  if (scene === 'mosaic') return <MosaicScene transform={transform} />;
  return <SparkScene transform={transform} />;
}

function OrbitScene({ transform }: { transform: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 120ms ease-out',
      }}
    >
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, rgba(var(--brand), 0.9), rgba(var(--brand), 0.3) 60%, transparent 70%)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
          transform: 'translateZ(40px)',
          animation: 'orbit-spin 16s linear infinite',
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: 36,
            height: 36,
            borderRadius: 14,
            background: 'rgb(var(--surface))',
            boxShadow: 'var(--shadow-low)',
            display: 'grid',
            placeItems: 'center',
            color: 'rgb(var(--brand-ink))',
            fontWeight: 700,
            transform: `rotate(${i * 90}deg) translate(120px) rotate(${-i * 90}deg) translateZ(60px)`,
            animation: `orbit-spin 16s linear infinite`,
          }}
        >
          <span className="msr" style={{ fontSize: 18 }}>
            {(['groups', 'event_available', 'forum', 'lightbulb'] as const)[i]}
          </span>
        </span>
      ))}
      <style>{`@keyframes orbit-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MosaicScene({ transform }: { transform: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: 10,
        padding: 28,
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 120ms ease-out',
      }}
    >
      {Array.from({ length: 16 }).map((_, idx) => {
        const isAccent = idx % 5 === 0 || idx === 6;
        return (
          <div
            key={idx}
            style={{
              borderRadius: 14,
              background: isAccent
                ? 'rgb(var(--brand))'
                : 'rgb(var(--surface))',
              boxShadow: 'var(--shadow-low)',
              transform: `translateZ(${(idx % 4) * 6}px)`,
              animation: `tile-float 4s ease-in-out ${idx * 0.07}s infinite alternate`,
            }}
          />
        );
      })}
      <style>{`@keyframes tile-float { from { transform: translateZ(0); } to { transform: translateZ(18px); } }`}</style>
    </div>
  );
}

function SparkScene({ transform }: { transform: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 120ms ease-out',
      }}
    >
      <span
        className="msr"
        style={{
          fontSize: 140,
          color: 'rgb(var(--brand-ink))',
          transform: 'translateZ(70px)',
          filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.15))',
          animation: 'spark-pop 5s ease-in-out infinite',
        }}
      >
        celebration
      </span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: i % 2 === 0 ? 'rgb(var(--brand))' : 'rgb(var(--brand-ink))',
            transform: `rotate(${i * 60}deg) translate(110px) translateZ(40px)`,
            animation: `spark-pop 5s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes spark-pop { 0%,100% { opacity: 0.85; transform: translateZ(40px) scale(1); } 50% { opacity: 1; transform: translateZ(80px) scale(1.08); } }`}</style>
    </div>
  );
}
