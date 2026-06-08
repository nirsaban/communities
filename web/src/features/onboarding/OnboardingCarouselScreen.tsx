import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Screen } from '../../components/AppBar';
import { AppButton } from '../../components/AppButton';
import { t } from '../../i18n';

const PLACEHOLDERS = [
  'illustration · find your people',
  'illustration · frictionless events',
  'illustration · your voice counts',
];

export function OnboardingCarouselScreen() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const slides = t.onboarding.slides;
  const last = i === slides.length - 1;

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
      <div className="imgph mx-5 mt-1" style={{ height: 336, borderRadius: 20 }}>
        <span className="lbl">{PLACEHOLDERS[i]}</span>
      </div>
      <main className="flex flex-1 flex-col px-5 pt-7">
        <h1 className="t-display-lg mb-2.5">{slides[i].title}</h1>
        <p className="t-body-lg" style={{ color: 'rgb(var(--muted))' }}>
          {slides[i].body}
        </p>
        <div className="mt-auto pb-6">
          <div className="mb-5 flex gap-1.5">
            {slides.map((_, idx) => (
              <span
                key={idx}
                style={{
                  height: 7,
                  width: idx === i ? 26 : 7,
                  borderRadius: 9,
                  background: idx === i ? 'rgb(var(--brand))' : 'rgb(var(--border-2))',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
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
      </main>
    </Screen>
  );
}
