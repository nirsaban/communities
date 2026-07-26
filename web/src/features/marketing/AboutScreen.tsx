import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import { LeadForm } from './LeadForm';

const FEATURE_KEYS = [1, 2, 3, 4, 5, 6] as const;

export function AboutScreen() {
  const l = t.landing;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-bold">{t.app.name}</span>
          <Link
            to="/login"
            className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface2"
          >
            {l.navLogin}
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <p className="text-sm font-semibold text-brand-ink">{l.heroEyebrow}</p>
        <h1 className="font-display mt-4 text-4xl font-bold leading-tight sm:text-5xl">
          {l.heroTitle1} <span className="text-brand-ink">{l.heroTitle2}</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{l.heroSubtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:hello@geniriflow.com"
            className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-on transition-transform hover:scale-105"
          >
            {l.heroCta}
          </a>
          <span className="text-sm text-muted">{l.heroNote}</span>
        </div>
      </section>

      {/* features */}
      <section className="border-t border-border bg-surface2">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-ink">{l.featuresEyebrow}</p>
            <h2 className="font-display mt-3 text-3xl font-bold">{l.featuresTitle}</h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((n) => (
              <div key={n} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="font-display text-lg font-bold">{l[`feature${n}Title` as keyof typeof l] as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {l[`feature${n}Body` as keyof typeof l] as string}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="border-t border-border bg-brand">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-bold text-brand-on">{l.finalCtaTitle}</h2>
          <p className="mt-4 text-brand-on/85">{l.finalCtaSubtitle}</p>
          <div className="mt-8">
            <LeadForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <p className="text-center text-sm text-muted">
          {t.app.name} · {l.footerTagline}
        </p>
      </footer>
    </div>
  );
}
