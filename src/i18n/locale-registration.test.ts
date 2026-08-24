// VTID-03509 — guards the invariant that lost es/sr for months.
//
// A locale directory full of correctly translated shards renders 100% German
// unless the locale is ALSO registered in src/i18n/index.ts. Nothing failed,
// nothing warned: es and sr shipped ~12.8k LLM-audited keys each that the app
// could not reach, because `catalogs['es-ES']` was undefined and
// i18n-toast.ts silently falls back to de-DE.
//
// These tests make that class of mistake fail in CI instead of in production.
// They read the filesystem rather than importing the catalogs, because
// import.meta.glob is a Vite build-time transform and the point here is to
// compare "what is on disk" against "what index.ts declares".

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const I18N_DIR = join(process.cwd(), 'src/i18n');
const INDEX_SRC = readFileSync(join(I18N_DIR, 'index.ts'), 'utf8');
const LANG_CONTEXT_SRC = readFileSync(
  join(process.cwd(), 'src/contexts/LanguageContext.tsx'),
  'utf8',
);

/** Locale directories actually present on disk (de, en, es, …). */
function localeDirsOnDisk(): string[] {
  return readdirSync(I18N_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** BCP-47 tags registered in the `catalogs` map in index.ts. */
function registeredTags(): string[] {
  const block = INDEX_SRC.split('export const catalogs')[1]?.split('};')[0] ?? '';
  return [...block.matchAll(/'([a-z]{2}-[A-Z]{2})'\s*:/g)].map((m) => m[1]).sort();
}

/** BCP-47 tags that have a lazy shard loader registered. */
function loaderTags(): string[] {
  const block = INDEX_SRC.split('const lazyLoaders')[1]?.split('};')[0] ?? '';
  return [...block.matchAll(/'([a-z]{2}-[A-Z]{2})'\s*:/g)].map((m) => m[1]).sort();
}

/** languageOptions entries from LanguageContext, with their status. */
function languageOptionEntries(): Array<{ value: string; status: string }> {
  const block = LANG_CONTEXT_SRC.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  return [...block.matchAll(/value:\s*"([^"]+)",\s*status:\s*'(\w+)'/g)].map((m) => ({
    value: m[1],
    status: m[2],
  }));
}

const TAG_TO_DIR: Record<string, string> = {
  'de-DE': 'de',
  'en-US': 'en',
  'es-ES': 'es',
  'sr-RS': 'sr',
  'fr-FR': 'fr',
  'pt-BR': 'pt',
  'ru-RU': 'ru',
  'pl-PL': 'pl',
  'ar-XA': 'ar',
  'zh-CN': 'zh',
  'tr-TR': 'tr',
};

describe('i18n locale registration', () => {
  it('registers every locale directory that exists on disk', () => {
    const onDisk = localeDirsOnDisk();
    const registeredDirs = registeredTags().map((t) => TAG_TO_DIR[t]);
    const unreachable = onDisk.filter((d) => !registeredDirs.includes(d));

    expect(
      unreachable,
      `these locale directories exist but are NOT in the \`catalogs\` map in ` +
        `src/i18n/index.ts, so selecting them renders German: ${unreachable.join(', ')}`,
    ).toEqual([]);
  });

  it('gives every registered non-default locale a lazy loader', () => {
    // de is eagerly bundled and deliberately has no lazy loader. Every other
    // registered locale needs one, or its catalog object stays permanently
    // empty and every lookup falls through to de.
    const needsLoader = registeredTags().filter((t) => t !== 'de-DE');
    const haveLoader = loaderTags();
    const missing = needsLoader.filter((t) => !haveLoader.includes(t));

    expect(
      missing,
      `registered in \`catalogs\` but missing from \`lazyLoaders\` in ` +
        `src/i18n/index.ts — the catalog would never populate: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('backs every user-selectable (ga/beta) language with a real catalog', () => {
    const selectable = languageOptionEntries().filter(
      (o) => o.status === 'ga' || o.status === 'beta',
    );
    const registered = registeredTags();

    const unbacked = selectable.filter((o) => !registered.includes(o.value));
    expect(
      unbacked.map((o) => o.value),
      `offered to users in LanguageContext but not registered in src/i18n/index.ts`,
    ).toEqual([]);
  });

  it('does not offer a ga language whose catalog directory is empty', () => {
    // 'beta' is allowed to be thin — that is what beta means. 'ga' is not:
    // a ga locale with no shards is a promise the app cannot keep.
    const ga = languageOptionEntries().filter((o) => o.status === 'ga');

    for (const opt of ga) {
      const dir = join(I18N_DIR, TAG_TO_DIR[opt.value] ?? '');
      expect(existsSync(dir), `ga locale ${opt.value} has no directory at ${dir}`).toBe(true);

      const shards = readdirSync(dir).filter((f) => f.endsWith('.json'));
      expect(
        shards.length,
        `ga locale ${opt.value} has ${shards.length} shards — too few to be GA`,
      ).toBeGreaterThan(50);
    }
  });

  it('keeps generated audit reports out of the bundled catalog tree', () => {
    // Audit reports are ~1.5 MB per locale of machine-readable verdicts. They
    // used to sit in src/i18n/<locale>/*._audit.json, where the eager de glob
    // swept them straight into the entry chunk. They now live in i18n-audit/.
    const stray: string[] = [];
    for (const dir of localeDirsOnDisk()) {
      for (const f of readdirSync(join(I18N_DIR, dir))) {
        if (f.includes('_audit')) stray.push(`${dir}/${f}`);
      }
    }
    expect(
      stray,
      'audit reports belong in i18n-audit/<locale>/, not src/i18n/<locale>/ — ' +
        'anything matching src/i18n/<locale>/*.json is bundled and shipped',
    ).toEqual([]);
  });
});
