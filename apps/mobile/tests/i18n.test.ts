/** VTID-05157 — the native i18n module reads the web catalog shards. */
import { readdirSync } from 'fs';
import { join } from 'path';
import { LOCALES, isRTL, translate, catalogs } from '../src/i18n';
import { SHARD_FILES } from '../src/i18n/catalog-map.generated';

const I18N_DIR = join(__dirname, '../../../src/i18n');

describe('catalogs', () => {
  it('ships the 11 GA locales', () => {
    expect([...LOCALES].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh']);
  });

  it.each([...LOCALES])('%s resolves common.loading to real text', (locale) => {
    const text = translate(locale, 'common.loading');
    expect(text).toBeTruthy();
    expect(text).not.toBe('common.loading');
  });

  it('a key missing in a locale falls back to de', () => {
    const key = 'vtid05157.onlyInDe';
    (catalogs.de as Record<string, unknown>).vtid05157 = { onlyInDe: 'Nur Deutsch {name}' };
    try {
      expect(translate('en', key, { name: 'X' })).toBe('Nur Deutsch X');
      expect(translate('xx', key, { name: 'Y' })).toBe('Nur Deutsch Y');
    } finally {
      delete (catalogs.de as Record<string, unknown>).vtid05157;
    }
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });

  it('only ar is right-to-left', () => {
    expect(isRTL('ar')).toBe(true);
    for (const l of LOCALES.filter((x) => x !== 'ar')) expect(isRTL(l)).toBe(false);
  });

  it.each([...LOCALES])('the generated map lists every %s shard on disk except _audit.json', (locale) => {
    const onDisk = readdirSync(join(I18N_DIR, locale))
      .filter((f) => f.endsWith('.json') && !f.endsWith('_audit.json'))
      .sort();
    expect([...(SHARD_FILES[locale] ?? [])]).toEqual(onDisk);
  });
});
