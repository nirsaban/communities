// Locale-aware `t` proxy. All screens should `import { t } from '../i18n'`
// (not from '../i18n/he') so the bundle swaps when useLocaleStore changes.
//
// Proxy semantics: top-level reads (`t.auth`) re-resolve the bundle on every
// access, so once setLocale fires and triggers a page reload, the next render
// pass picks up the new strings. Components that destructure sub-objects into
// variables snapshot at render time — that's intentional and lines up with
// our reload-on-toggle UX.

import { t as he } from './he';
import { t as en } from './en';
import { useLocaleStore } from './locale';
import type { Strings } from './he';

const BUNDLES = { en, he } as const;

export const t = new Proxy({} as Strings, {
  get(_target, prop) {
    const locale = useLocaleStore.getState().locale;
    return (BUNDLES[locale] as unknown as Record<string | symbol, unknown>)[prop];
  },
}) as Strings;

export { useT, useLocaleStore } from './locale';
export type { Locale } from './locale';
export type { Strings } from './he';
