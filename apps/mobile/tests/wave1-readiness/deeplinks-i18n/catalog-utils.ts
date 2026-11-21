/** VTID-05682 — shared read-only helpers for the deeplinks-i18n readiness tests (not a test file). */
import { catalogs, LOCALES, type Locale } from '../../../src/i18n';

export type Flat = Record<string, unknown>;

/** The composed catalog of a locale flattened to dotted keys (leaf values only). */
export function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = value;
  }
  return out;
}

const cache = new Map<Locale, Flat>();
export function flatCatalog(locale: Locale): Flat {
  let f = cache.get(locale);
  if (!f) {
    f = flatten(catalogs[locale]);
    cache.set(locale, f);
  }
  return f;
}

/** The `{name}` placeholders of a catalog value. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[0]);
}

export const OTHER_LOCALES = LOCALES.filter((l) => l !== 'de');
