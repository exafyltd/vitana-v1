/**
 * VTID-05093 (Health Hub D10, WP2) — the consent wording lock.
 *
 * "Which words did the member see?" must be answerable from git +
 * text_version + shown_locale. So:
 *   - every versioned wording key exists in all 11 locales with the same
 *     placeholders, and every version has a lock-manifest entry;
 *   - a RELEASED version's text may never change: its sha256 per locale is
 *     pinned in src/i18n/health-consent-texts.lock.json (new wording = v2);
 *   - a released version is owner/counsel text (DE + EN at least) and carries
 *     no [DRAFT] marker; a draft version always carries it;
 *   - the draft gate: nothing resolves as displayable until it is released,
 *     and the locale returned is the locale whose catalogue holds the text.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONSENT_LOCALES,
  CONSENT_LOCALE_TAGS,
  DRAFT_MARKER,
  HEALTH_CONSENT_CATEGORIES,
  HEALTH_CONSENT_LOCK,
  readConsentTexts,
  resolveConsentWording,
  toConsentLocale,
  type ConsentLockManifest,
  type ConsentTexts,
} from './health-consent-wording';

const ROOT = resolve(__dirname, '../..');
const I18N = resolve(ROOT, 'src/i18n');

type Json = Record<string, unknown>;
const shards: Record<string, Json> = {};
for (const loc of CONSENT_LOCALES) {
  shards[loc] = JSON.parse(readFileSync(resolve(I18N, loc, 'screens.json'), 'utf8')) as Json;
}
const lock = JSON.parse(readFileSync(resolve(I18N, 'health-consent-texts.lock.json'), 'utf8')) as ConsentLockManifest;

function wordingTree(loc: string): Record<string, Record<string, Json>> {
  const s = (shards[loc].screens as Json).settings as Json;
  return (s.healthConsent ?? {}) as Record<string, Record<string, Json>>;
}

function wordingHash(t: ConsentTexts): string {
  return createHash('sha256').update(`${t.title}\n${t.body}\n${t.checkbox}`).digest('hex');
}

const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();

describe('health consent wording lock (VTID-05093)', () => {
  it('the eleven locale directories are exactly the consent locales', () => {
    const dirs = readdirSync(I18N, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.length === 2).map((d) => d.name);
    expect(dirs.sort()).toEqual([...CONSENT_LOCALES].sort());
  });

  it('the wording covers exactly the five gateway categories, each with a lock entry per version', () => {
    const de = wordingTree('de');
    expect(Object.keys(de).sort()).toEqual([...HEALTH_CONSENT_CATEGORIES].sort());
    for (const category of HEALTH_CONSENT_CATEGORIES) {
      const versions = Object.keys(de[category]);
      expect(versions.length, category).toBeGreaterThan(0);
      for (const v of versions) {
        expect(v, `${category} version key`).toMatch(/^v\d+$/);
        expect(lock.texts[category]?.[v], `lock entry for ${category}.${v}`).toBeTruthy();
      }
      // No lock entry for a version that has no text.
      expect(Object.keys(lock.texts[category] ?? {}).sort()).toEqual(versions.sort());
    }
  });

  it('every version has title/body/checkbox in all 11 locales with the same placeholders as DE', () => {
    const de = wordingTree('de');
    for (const category of HEALTH_CONSENT_CATEGORIES) {
      for (const v of Object.keys(de[category])) {
        const ref = readConsentTexts(shards.de, category, v)!;
        expect(ref, `${category}.${v} de`).toBeTruthy();
        for (const loc of CONSENT_LOCALES) {
          const texts = readConsentTexts(shards[loc], category, v);
          expect(texts, `${category}.${v} ${loc}`).toBeTruthy();
          for (const part of ['title', 'body', 'checkbox'] as const) {
            expect(texts![part].trim().length, `${category}.${v}.${part} ${loc}`).toBeGreaterThan(0);
            expect(placeholders(texts![part]), `${category}.${v}.${part} ${loc}`).toEqual(placeholders(ref[part]));
          }
        }
      }
    }
  });

  it('a released version is locked: DE + EN at least, sha256 matches per locale, no draft marker', () => {
    for (const [category, versions] of Object.entries(lock.texts)) {
      for (const [v, entry] of Object.entries(versions ?? {})) {
        if (entry.status !== 'released') {
          expect(entry.status, `${category}.${v}`).toBe('draft');
          continue;
        }
        expect(Object.keys(entry.locales ?? {}), `${category}.${v} released locales`).toEqual(expect.arrayContaining(['de', 'en']));
        for (const [loc, sha] of Object.entries(entry.locales ?? {})) {
          const texts = readConsentTexts(shards[loc], category, v)!;
          expect(texts, `${category}.${v} ${loc}`).toBeTruthy();
          expect(wordingHash(texts), `released text ${category}.${v} (${loc}) changed — add a new version instead`).toBe(sha);
          expect(`${texts.title}${texts.body}${texts.checkbox}`, `${category}.${v} ${loc}`).not.toContain(DRAFT_MARKER);
        }
      }
    }
  });

  it('a draft version is visibly a draft in every locale (title starts with [DRAFT])', () => {
    for (const [category, versions] of Object.entries(lock.texts)) {
      for (const [v, entry] of Object.entries(versions ?? {})) {
        if (entry.status !== 'draft') continue;
        for (const loc of CONSENT_LOCALES) {
          expect(readConsentTexts(shards[loc], category, v)!.title.startsWith(DRAFT_MARKER), `${category}.${v} ${loc}`).toBe(true);
        }
      }
    }
  });

  it('the app bundles the same manifest the guard checks', () => {
    expect(HEALTH_CONSENT_LOCK).toEqual(lock);
  });

  it('the shipped (draft) wording is never displayable — the grant UI stays gated', () => {
    for (const category of HEALTH_CONSENT_CATEGORIES) {
      for (const loc of CONSENT_LOCALES) {
        if (lock.texts[category]?.v1?.status === 'released') continue;
        expect(resolveConsentWording(category, 'v1', CONSENT_LOCALE_TAGS[loc]), `${category} ${loc}`).toEqual({ status: 'draft' });
      }
    }
    expect(resolveConsentWording('health_data_analytics', null, 'de-DE')).toEqual({ status: 'draft' });
    expect(resolveConsentWording('health_data_analytics', 'v9', 'de-DE')).toEqual({ status: 'draft' });
  });
});

describe('resolveConsentWording (VTID-05093)', () => {
  const texts = (lang: string): ConsentTexts => ({ title: `T-${lang}`, body: `B-${lang} {name}`, checkbox: `C-${lang}` });
  const catalog = (t: ConsentTexts | null) =>
    t ? { screens: { settings: { healthConsent: { wearables: { v1: t } } } } } : {};
  const cats = {
    'de-DE': catalog(texts('de')),
    'en-US': catalog(texts('en')),
    'fr-FR': catalog(texts('fr')),
    'ar-XA': {},
  } as Record<string, Record<string, unknown>>;
  const released = (locales: string[]): ConsentLockManifest => ({
    texts: { wearables: { v1: { status: 'released', locales: Object.fromEntries(locales.map((l) => [l, 'x'])) } } },
  });

  it('shows the app locale when that locale is released', () => {
    expect(resolveConsentWording('wearables', 'v1', 'fr-FR', released(['de', 'en', 'fr']), cats)).toEqual({
      status: 'released',
      locale: 'fr',
      texts: texts('fr'),
    });
  });

  it('falls back to released EN, then DE — and reports the locale actually displayed', () => {
    expect(resolveConsentWording('wearables', 'v1', 'fr-FR', released(['de', 'en']), cats)).toMatchObject({ locale: 'en' });
    expect(resolveConsentWording('wearables', 'v1', 'fr-FR', released(['de']), cats)).toMatchObject({ locale: 'de' });
    // Released for ar, but the ar catalogue has no text: never pretend it was shown in ar.
    expect(resolveConsentWording('wearables', 'v1', 'ar-XA', released(['ar', 'de', 'en']), cats)).toMatchObject({ locale: 'en' });
  });

  it('a draft or a released text with the draft marker is never displayable', () => {
    expect(resolveConsentWording('wearables', 'v1', 'de-DE', { texts: { wearables: { v1: { status: 'draft' } } } }, cats)).toEqual({
      status: 'draft',
    });
    const marked = { 'de-DE': catalog({ ...texts('de'), title: `${DRAFT_MARKER} T` }) };
    expect(resolveConsentWording('wearables', 'v1', 'de-DE', released(['de']), marked)).toEqual({ status: 'draft' });
  });

  it('maps app locale tags to the gateway locales', () => {
    expect(toConsentLocale('pt-BR')).toBe('pt');
    expect(toConsentLocale('ar-XA')).toBe('ar');
    expect(toConsentLocale('xx-YY')).toBe('de');
  });
});
