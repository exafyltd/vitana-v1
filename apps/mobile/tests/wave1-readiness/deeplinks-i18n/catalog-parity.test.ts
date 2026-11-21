/**
 * VTID-05682 (native-wave1-readiness-tests/deeplinks-i18n, L3) — whole-catalog parity of
 * the 11 locales over `catalogs` / the generated shard map. `de` is the source of truth.
 * Asserts only what holds on main; the exceptions below are findings recorded in
 * docs/validation/VTID-05682/acceptance.md, not fixed here (no catalog edit in this lane).
 */
import { LOCALES } from '../../../src/i18n';
import { SHARD_FILES } from '../../../src/i18n/catalog-map.generated';
import { flatCatalog, OTHER_LOCALES, placeholders } from './catalog-utils';

/**
 * FINDING F1: these two `tr` values are empty strings on main (`de` and `en` have text).
 * The "no empty value" assertion is scoped to every other key; remove an entry here when
 * the translation lands.
 */
const KNOWN_EMPTY: Record<string, readonly string[]> = {
  tr: ['screens.profile.dancePreferences', 'screens.sharing.stressLevels'],
};

describe('catalog parity — 11 locales', () => {
  it('covers exactly the 11 GA locales', () => {
    expect([...LOCALES].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh']);
  });

  it('de has shards and keys', () => {
    expect(SHARD_FILES.de.length).toBeGreaterThan(100);
    expect(Object.keys(flatCatalog('de')).length).toBeGreaterThan(1000);
  });

  it.each([...OTHER_LOCALES])('%s has the same shard file set as de', (locale) => {
    expect([...SHARD_FILES[locale]]).toEqual([...SHARD_FILES.de]);
  });

  it.each([...OTHER_LOCALES])('%s has every key that de has', (locale) => {
    const own = flatCatalog(locale);
    const missing = Object.keys(flatCatalog('de')).filter((k) => !(k in own));
    expect(missing).toEqual([]);
  });

  it.each([...OTHER_LOCALES])('%s keeps every {placeholder} of the de value, key by key', (locale) => {
    const own = flatCatalog(locale);
    const bad: string[] = [];
    for (const [key, de] of Object.entries(flatCatalog('de'))) {
      const v = own[key];
      if (typeof de !== 'string' || typeof v !== 'string') continue;
      for (const p of placeholders(de)) if (!v.includes(p)) bad.push(`${key}: ${p}`);
    }
    expect(bad).toEqual([]);
  });

  it.each([...LOCALES])('%s has no empty string value (known exceptions listed)', (locale) => {
    const allowed = new Set(KNOWN_EMPTY[locale] ?? []);
    const empty = Object.entries(flatCatalog(locale))
      .filter(([k, v]) => typeof v === 'string' && v.trim() === '' && !allowed.has(k))
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('the known empty values are exactly the recorded ones (the exception list cannot go stale)', () => {
    for (const locale of LOCALES) {
      const actual = Object.entries(flatCatalog(locale))
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k)
        .sort();
      expect(actual).toEqual([...(KNOWN_EMPTY[locale] ?? [])].sort());
    }
  });
});
