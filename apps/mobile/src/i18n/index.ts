/**
 * VTID-05157 — native i18n over the web app's own catalog shards
 * (Native app Wave 0, plan change 6).
 *
 * The shards are the same JSON files the web app loads (src/i18n/<locale>/),
 * read-only, through the generated static map (Metro has no import.meta.glob).
 * Lookup semantics match the web `t()` in src/lib/i18n-toast.ts: dotted keys,
 * `{param}` placeholders, fallback to `de` (the source of truth). Wave 0 loads
 * every catalog eagerly; lazy per-locale loading is a Wave 1 decision measured
 * on the bundle size NATIVE-CI reports.
 */
import { getLocales } from 'expo-localization';
import { SHARDS, type Shard } from './catalog-map.generated';

/** The 11 GA locales (src/contexts/LanguageContext.tsx). `de` is the source of truth. */
export const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const FALLBACK_LOCALE: Locale = 'de';

const RTL_LOCALES: ReadonlySet<string> = new Set(['ar']);

export type Params = Record<string, string | number>;
type Catalog = Record<string, unknown>;

/** Same composition as the web loader: shards in sorted order, top-level keys merged. */
function compose(shards: readonly Shard[] | undefined): Catalog {
  const out: Catalog = {};
  for (const shard of shards ?? []) Object.assign(out, shard);
  return out;
}

export const catalogs: Record<Locale, Catalog> = Object.fromEntries(
  LOCALES.map((l) => [l, compose(SHARDS[l])]),
) as Record<Locale, Catalog>;

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

function resolve(catalog: Catalog | undefined, key: string): string | undefined {
  let v: unknown = catalog;
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && part in (v as Catalog)) v = (v as Catalog)[part];
    else return undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

function applyParams(text: string, params?: Params): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Looks `key` up in `locale`, then in `de`; returns the key itself when both miss. */
export function translate(locale: string, key: string, params?: Params): string {
  const primary = isLocale(locale) ? catalogs[locale] : undefined;
  const text = resolve(primary, key) ?? resolve(catalogs[FALLBACK_LOCALE], key) ?? key;
  return applyParams(text, params);
}

/** The device's first preferred language if we ship it, else `de`. */
export function localeFromDevice(): Locale {
  for (const l of getLocales()) {
    if (isLocale(l.languageCode)) return l.languageCode;
  }
  return FALLBACK_LOCALE;
}
