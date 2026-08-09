// Loads per-namespace shards from src/i18n/<locale>/*.json and composes
// them into a single catalog object that matches the legacy de.json/en.json
// shape. Existing translate('orders.tabs.active') calls keep working.
//
// Cold-load optimization (VTID-03255): only the DEFAULT locale (de — the
// primary user base) is eagerly baked into the bundle. The non-default mirrors
// (en, ar) are loaded on demand via ensureCatalog(), so ~1 MB of translations
// the typical first paint never needs stays out of the entry chunk. Until a
// lazy locale finishes loading, lookups gracefully fall back to de (see
// i18n-toast.ts / useTranslation.ts), so nothing renders as raw keys.
//
// IMPORTANT: this is data lazy-loading (import.meta.glob without eager), NOT
// vendor code-splitting. JSON shards have no imports, so there is no risk of a
// cross-chunk circular-dependency / initialization-order error.

const deModules = import.meta.glob('./de/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

// Lazy loaders: `import.meta.glob` WITHOUT `eager` returns a map of
// path -> () => Promise<module>. The shards are emitted as their own chunks
// and only fetched when ensureCatalog() runs for that locale.
const enLoaders = import.meta.glob('./en/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;
const arLoaders = import.meta.glob('./ar/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;

function compose(modules: Record<string, { default: Record<string, unknown> }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of Object.keys(modules).sort()) {
    const shard = modules[path].default;
    for (const [key, value] of Object.entries(shard)) {
      out[key] = value;
    }
  }
  return out;
}

export const de = compose(deModules);

// en/ar start empty and are filled IN PLACE by ensureCatalog() so the
// `catalogs` object references held by consumers (i18n-toast, useTranslation)
// see the populated data without needing a new object reference.
export const en: Record<string, unknown> = {};
export const ar: Record<string, unknown> = {};

export const catalogs: Record<string, Record<string, unknown>> = {
  'en-US': en,
  'de-DE': de,
  'ar-XA': ar,
};

const lazyLoaders: Record<
  string,
  Record<string, () => Promise<{ default: Record<string, unknown> }>>
> = {
  'en-US': enLoaders,
  'ar-XA': arLoaders,
};

// de is bundled, so it counts as already loaded.
const loadedLocales = new Set<string>(['de-DE']);
const catalogListeners = new Set<() => void>();

/** Subscribe to "a lazy locale finished loading" so the UI can re-render. */
export function onCatalogLoaded(cb: () => void): () => void {
  catalogListeners.add(cb);
  return () => catalogListeners.delete(cb);
}

/** Whether a locale's catalog is available synchronously. */
export function isCatalogLoaded(locale: string): boolean {
  return loadedLocales.has(locale);
}

/**
 * Ensure a locale's catalog is loaded. No-op for the eager default (de) and
 * for unknown/draft locales (which fall back to de). Safe to call repeatedly
 * and concurrently. Notifies subscribers once the shards are merged in.
 */
export async function ensureCatalog(locale: string): Promise<void> {
  if (loadedLocales.has(locale)) return;
  const map = lazyLoaders[locale];
  if (!map) return; // no lazy shards for this locale → de fallback stays
  const target = catalogs[locale];
  if (!target) return;
  loadedLocales.add(locale); // mark before awaiting to de-dupe concurrent calls
  try {
    const paths = Object.keys(map).sort();
    const mods = await Promise.all(paths.map((p) => map[p]()));
    for (const mod of mods) {
      for (const [key, value] of Object.entries(mod.default)) {
        target[key] = value;
      }
    }
    for (const cb of catalogListeners) cb();
  } catch (err) {
    loadedLocales.delete(locale); // allow a later retry
    console.warn('[i18n] failed to load locale catalog:', locale, err);
  }
}
