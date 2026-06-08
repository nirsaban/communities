import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { t as he } from './he';
import { t as en } from './en';
import type { Strings } from './he';

export type Locale = 'en' | 'he';

const BUNDLES: Record<Locale, Strings> = { en, he };

const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  he: 'rtl',
};

type LocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en', // English is the design default — Hebrew is the toggle.
      setLocale: (locale) => {
        applyDirection(locale);
        set({ locale });
      },
    }),
    {
      name: 'community-locale',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyDirection(state.locale);
      },
    },
  ),
);

function applyDirection(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = DIRECTION[locale];
}

// Apply on first import so SSR/CSR hydrate consistent direction.
if (typeof window !== 'undefined') {
  applyDirection(useLocaleStore.getState().locale);
}

// Live string bundle keyed off the current store. Components that already
// import `t` from '../i18n/he' get switched to `useT()` for reactive updates;
// non-reactive call sites can still read `getT()` for one-shot lookups.
export function useT(): Strings {
  const locale = useLocaleStore((s) => s.locale);
  return BUNDLES[locale];
}

export function getT(): Strings {
  return BUNDLES[useLocaleStore.getState().locale];
}
