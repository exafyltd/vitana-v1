// Lazy per-locale catalog loading.
//
// Previously this module eager-globbed en + de + ar (~4 MB of JSON) straight
// into the entry bundle, so every user — even English ones — downloaded and
// JSON-parsed the entire German catalog on the main thread before first paint.
// On the iPhone (Appilix WebView) that parse alone cost ~0.5–1.5 s.
//
// Now each locale lives in its own async chunk (see ./locales/*.ts). main.tsx
// awaits only the active locale + the de-DE fallback before mounting React;
// other locales load on demand when the user switches language. The entry
// bundle no longer carries any translation JSON.
//
// Synchronous consumers (useTranslation, i18n-toast, use-scoped-t, Apply.tsx)
// read `catalogs` / `de` / `en` / `ar` by reference. Those objects are stable
// and mutated IN PLACE by loadLocale(), so a re-render after a load picks up
// the freshly populated catalog without the reference ever changing.

export const FALLBACK_LOCALE = 'de-DE';

// Stable catalog objects, filled in place as locales load.
export const de: Record<string, unknown> = {};
export const en: Record<string, unknown> = {};
export const ar: Record<string, unknown> = {};

export const catalogs: Record<string, Record<string, unknown>> = {
  'de-DE': de,
  'en-US': en,
  'ar-XA': ar,
};

// locale → dynamic import of its single-chunk catalog module.
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  'de-DE': () => import('./locales/de'),
  'en-US': () => import('./locales/en'),
  'ar-XA': () => import('./locales/ar'),
};

const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function isLocaleLoaded(locale: string): boolean {
  return loaded.has(locale);
}

/**
 * Fetch and compose a locale's catalog into `catalogs` (idempotent, dedupes
 * concurrent calls). Unknown / not-yet-bundled locales (es, sr, …) resolve to
 * a no-op so callers fall back to de-DE without throwing.
 */
export async function loadLocale(locale: string): Promise<void> {
  if (loaded.has(locale)) return;
  const existing = inflight.get(locale);
  if (existing) return existing;

  const loader = LOADERS[locale];
  if (!loader) {
    loaded.add(locale); // unknown locale — nothing to load; de-DE covers it
    return;
  }

  const p = (async () => {
    try {
      const mod = await loader();
      // Mutate in place so references held by Apply.tsx etc. stay valid.
      Object.assign(catalogs[locale], mod.default);
      loaded.add(locale);
    } finally {
      inflight.delete(locale);
    }
  })();
  inflight.set(locale, p);
  return p;
}

/** Load several locales in parallel (used by the boot path in main.tsx). */
export function ensureLocales(locales: string[]): Promise<void[]> {
  return Promise.all([...new Set(locales)].map(loadLocale));
}
