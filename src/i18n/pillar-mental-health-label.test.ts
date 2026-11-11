// VTID-05691 — strategy-execution-wave1 / mental-health-label.
//
// Owner, 2026-11-11: "The app must explicitly identify the fifth pillar as Mental Health,
// not merely Mental." Every pillar-NAME label of the fifth pillar (code key `mental`, in an
// object whose siblings are the other pillars: nutrition / hydration / exercise / sleep)
// must read "Mental Health" in its language. Sentences and plan names ("Mental Plan") are
// not pillar names and are not checked here. Reads the shards from disk (no Vite transform).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

/** [shard file, dotted key path, true when the value carries the "🧠 " emoji prefix]. */
const PILLAR_NAME_KEYS: ReadonlyArray<readonly [string, string, boolean]> = [
  ['health.json', 'health.pillars.mental', false],
  ['vitanaIndex.json', 'vitanaIndex.mental', false],
  ['newsCard.json', 'newsCard.pillars.mental', false],
  ['healthNative.json', 'healthNative.plans.pillarName.mental', false],
  ['screens.json', 'screens.common.mental', false],
  ['screens.json', 'screens.community.mental', false],
  ['screens.json', 'screens.health.mental', true],
  ['screens.json', 'screens.healthtracker.mental', false],
  ['vcal.json', 'vcal.kinds.mental', false],
];

/** The pillar name "Mental Health" per locale (DE is the source of truth). */
const MENTAL_HEALTH: Record<Locale, string> = {
  de: 'Mentale Gesundheit',
  en: 'Mental Health',
  es: 'Salud mental',
  sr: 'Mentalno zdravlje',
  fr: 'Santé mentale',
  pl: 'Zdrowie psychiczne',
  pt: 'Saúde mental',
  ru: 'Психическое здоровье',
  tr: 'Ruh sağlığı',
  zh: '心理健康',
  ar: 'الصحة النفسية',
};

/**
 * Values that already named the pillar "mental health" on base and are deliberately left
 * unchanged (lane rule: skip keys that already say mental health). Any other value must be
 * exactly MENTAL_HEALTH[locale].
 */
const ALREADY_MENTAL_HEALTH: Partial<Record<Locale, Record<string, string>>> = {
  ru: {
    'newsCard.pillars.mental': 'Ментальное здоровье',
    'screens.health.mental': '🧠 Ментальное здоровье',
  },
  ar: {
    'vitanaIndex.mental': 'الصحة العقلية',
    'screens.common.mental': 'الصحة العقلية',
  },
};

/** Bare one-word "mental" adjectives / nouns that the pillar name must no longer be. */
const BARE_MENTAL = new Set([
  'Mental', 'Mentales', 'Mente', 'Mentalno', 'Mentalny', 'Mentalne', 'Psychika', 'Umysł', 'Samopoczucie',
  'Ментальное', 'Психика', 'Zihinsel', 'Zihin', '心理', 'نفسي', 'ذهني', 'العقلية',
]);

const cache = new Map<string, unknown>();
function shard(locale: string, file: string): unknown {
  const k = `${locale}/${file}`;
  if (!cache.has(k)) cache.set(k, JSON.parse(readFileSync(join(process.cwd(), 'src/i18n', locale, file), 'utf8')));
  return cache.get(k);
}
function valueAt(locale: string, file: string, path: string): unknown {
  return path.split('.').reduce<unknown>((o, key) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined), shard(locale, file));
}
function expected(locale: Locale, path: string, emoji: boolean): string {
  return ALREADY_MENTAL_HEALTH[locale]?.[path] ?? `${emoji ? '🧠 ' : ''}${MENTAL_HEALTH[locale]}`;
}

describe('fifth pillar is named "Mental Health" (VTID-05691)', () => {
  it.each(['de', 'en'] as const)('%s: every pillar-name key reads the new label exactly', (locale) => {
    for (const [file, path, emoji] of PILLAR_NAME_KEYS) {
      expect(valueAt(locale, file, path), `${locale}/${file} ${path}`).toBe(`${emoji ? '🧠 ' : ''}${MENTAL_HEALTH[locale]}`);
    }
  });

  it.each(LOCALES)('%s: every pillar-name key exists, is non-empty and names mental health', (locale) => {
    for (const [file, path, emoji] of PILLAR_NAME_KEYS) {
      const v = valueAt(locale, file, path);
      expect(typeof v, `${locale}/${file} ${path} missing`).toBe('string');
      const s = (v as string).trim();
      expect(s.length, `${locale}/${file} ${path} is empty`).toBeGreaterThan(0);
      const bare = s.replace(/^🧠\s*/, '');
      expect(BARE_MENTAL.has(bare), `${locale}/${file} ${path} is still the bare "${bare}"`).toBe(false);
      expect(v, `${locale}/${file} ${path}`).toBe(expected(locale, path, emoji));
    }
  });

  it('the pillar-name objects still hold the other pillars as siblings (keys unchanged)', () => {
    for (const locale of LOCALES) {
      for (const [file, path] of PILLAR_NAME_KEYS) {
        const parent = valueAt(locale, file, path.split('.').slice(0, -1).join('.')) as Record<string, unknown>;
        for (const sibling of ['exercise', 'sleep']) {
          expect(typeof parent?.[sibling], `${locale}/${file} ${path}: sibling ${sibling}`).toBe('string');
        }
      }
    }
  });
});
