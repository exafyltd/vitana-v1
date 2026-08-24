// Loads per-namespace shards from src/i18n/<locale>/*.json and composes
// them into a single catalog object that matches the legacy de.json/en.json
// shape. Existing translate('orders.tabs.active') calls keep working.
//
// Cold-load optimization (VTID-03255): only the DEFAULT locale (de — the
// primary user base) is eagerly baked into the bundle. Every other locale is
// loaded on demand via ensureCatalog(), so ~1 MB of translations the typical
// first paint never needs stays out of the entry chunk. Until a lazy locale
// finishes loading, lookups gracefully fall back to de (see i18n-toast.ts /
// useTranslation.ts), so nothing renders as raw keys.
//
// IMPORTANT: this is data lazy-loading (import.meta.glob without eager), NOT
// vendor code-splitting. JSON shards have no imports, so there is no risk of a
// cross-chunk circular-dependency / initialization-order error.
//
// VTID-03509 — REGISTERING A LOCALE IS WHAT MAKES IT EXIST.
// A locale directory full of translated shards does nothing on its own. It is
// reachable only if it appears in BOTH maps below (`LOCALE_LOADERS` and
// `catalogs`), because i18n-toast.ts resolves `catalogs[currentLocale]` and
// falls back to de-DE when that is undefined. es/sr shipped ~12.8k
// LLM-audited keys each and rendered 100% German in production for months
// purely because they were missing from these two maps. If you add a locale
// directory, add it here in the same commit, and extend the round-trip guard
// in src/i18n/__tests__/locale-registration.test.ts.

const deModules = import.meta.glob('./de/*.json', { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

// Lazy loaders: `import.meta.glob` WITHOUT `eager` returns a map of
// path -> () => Promise<module>. The shards are emitted as their own chunks
// and only fetched when ensureCatalog() runs for that locale.
//
// The glob pattern must be a literal — it cannot be built from a variable —
// so each locale needs its own line. That repetition is the price of Vite
// being able to statically discover the chunks at build time.
type ShardLoaders = Record<string, () => Promise<{ default: Record<string, unknown> }>>;

const enLoaders = import.meta.glob('./en/*.json') as ShardLoaders;
const esLoaders = import.meta.glob('./es/*.json') as ShardLoaders;
const srLoaders = import.meta.glob('./sr/*.json') as ShardLoaders;
const frLoaders = import.meta.glob('./fr/*.json') as ShardLoaders;
const ptLoaders = import.meta.glob('./pt/*.json') as ShardLoaders;
const ruLoaders = import.meta.glob('./ru/*.json') as ShardLoaders;
const plLoaders = import.meta.glob('./pl/*.json') as ShardLoaders;
const arLoaders = import.meta.glob('./ar/*.json') as ShardLoaders;
const zhLoaders = import.meta.glob('./zh/*.json') as ShardLoaders;
const trLoaders = import.meta.glob('./tr/*.json') as ShardLoaders;

// `_audit.json` files sit alongside the real shards (they are the LLM audit
// reports from scripts/i18n-audit-llm.mjs). They are NOT translations and must
// never be composed into a catalog — their keys would shadow real ones.
function isShard(path: string): boolean {
  return !path.endsWith('_audit.json');
}

function compose(modules: Record<string, { default: Record<string, unknown> }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of Object.keys(modules).filter(isShard).sort()) {
    const shard = modules[path].default;
    for (const [key, value] of Object.entries(shard)) {
      out[key] = value;
    }
  }
  return out;
}

export const de = compose(deModules);

// Non-default locales start empty and are filled IN PLACE by ensureCatalog()
// so the `catalogs` object references held by consumers (i18n-toast,
// useTranslation) see the populated data without needing a new object
// reference.
export const en: Record<string, unknown> = {};
export const es: Record<string, unknown> = {};
export const sr: Record<string, unknown> = {};
export const fr: Record<string, unknown> = {};
export const pt: Record<string, unknown> = {};
export const ru: Record<string, unknown> = {};
export const pl: Record<string, unknown> = {};
export const ar: Record<string, unknown> = {};
export const zh: Record<string, unknown> = {};
export const tr: Record<string, unknown> = {};

export const catalogs: Record<string, Record<string, unknown>> = {
  'de-DE': de,
  'en-US': en,
  'es-ES': es,
  'sr-RS': sr,
  'fr-FR': fr,
  'pt-BR': pt,
  'ru-RU': ru,
  'pl-PL': pl,
  'ar-XA': ar,
  'zh-CN': zh,
  'tr-TR': tr,
};

const lazyLoaders: Record<string, ShardLoaders> = {
  'en-US': enLoaders,
  'es-ES': esLoaders,
  'sr-RS': srLoaders,
  'fr-FR': frLoaders,
  'pt-BR': ptLoaders,
  'ru-RU': ruLoaders,
  'pl-PL': plLoaders,
  'ar-XA': arLoaders,
  'zh-CN': zhLoaders,
  'tr-TR': trLoaders,
};

/** Locales with a registered catalog. Exported for the registration guard test. */
export const REGISTERED_LOCALES = Object.keys(catalogs);

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
    const paths = Object.keys(map).filter(isShard).sort();
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
