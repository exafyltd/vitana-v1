/**
 * VTID-05166 (Health Hub Phase 1 / C3) — consent copy for the Health Sync
 * consents (`sync_activity`, `sync_sleep`, `sync_heart`, `sync_body`) and the
 * self-logged consent (`self_logged_health`) that VTID-05164 (C1) adds to the
 * gateway's D10 catalogue.
 *
 * The VTID-05093 lock guard (health-consent-wording.vtid-05093.test.ts) already
 * covers every category in HEALTH_CONSENT_CATEGORIES (11-locale parity,
 * placeholders, lock entries, draft markers). This file pins what C3 adds:
 *   - the five keys mirror the gateway's catalogue (C1) and are per-resource
 *     exactly where the gateway says so;
 *   - their v1 wording ships as a DRAFT (counsel wording pending): lock status
 *     `draft`, `[DRAFT]` title in every locale, never displayable;
 *   - the chrome labels (category names, section headings, phone-store names)
 *     exist in all 11 locales with the right placeholders;
 *   - DE (source of truth) is du-form: no Sie/Ihr/Ihnen;
 *   - listConsentSources lists the Health Sync rows from the catalogue only,
 *     and always lists an active consent so it can be withdrawn.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONSENT_LOCALES,
  CONSENT_LOCALE_TAGS,
  DRAFT_MARKER,
  HEALTH_CONSENT_CATEGORIES,
  HEALTH_SYNC_CONSENT_KEYS,
  PER_RESOURCE_CATEGORIES,
  PHONE_HEALTH_STORES,
  readConsentTexts,
  resolveConsentWording,
  type ConsentLockManifest,
} from './health-consent-wording';
import { listConsentSources, type HealthConsentsState } from '@/hooks/useHealthConsents';

const I18N = resolve(__dirname, '../i18n');
type Json = Record<string, unknown>;
const shards: Record<string, Json> = {};
for (const loc of CONSENT_LOCALES) {
  shards[loc] = JSON.parse(readFileSync(resolve(I18N, loc, 'screens.json'), 'utf8')) as Json;
}
const lock = JSON.parse(readFileSync(resolve(I18N, 'health-consent-texts.lock.json'), 'utf8')) as ConsentLockManifest;

const C3_KEYS = [...HEALTH_SYNC_CONSENT_KEYS, 'self_logged_health'] as const;
const ui = (loc: string) => ((shards[loc].screens as Json).settings as Json).healthConsentUi as Json;
const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();

describe('Health Sync consent keys (VTID-05166)', () => {
  it('the app knows the five keys VTID-05164 adds to the gateway catalogue, after the five D10 WP1 keys', () => {
    expect(HEALTH_CONSENT_CATEGORIES.slice(5)).toEqual(['sync_activity', 'sync_sleep', 'sync_heart', 'sync_body', 'self_logged_health']);
    expect(HEALTH_SYNC_CONSENT_KEYS).toEqual(['sync_activity', 'sync_sleep', 'sync_heart', 'sync_body']);
    expect(PHONE_HEALTH_STORES).toEqual(['apple_health', 'health_connect']);
  });

  it('sync_* are per source (resource_id = phone store / aggregator); self_logged_health is whole-category', () => {
    for (const k of HEALTH_SYNC_CONSENT_KEYS) expect(PER_RESOURCE_CATEGORIES.has(k), k).toBe(true);
    expect(PER_RESOURCE_CATEGORIES.has('self_logged_health')).toBe(false);
  });
});

describe('Health Sync consent wording — draft until counsel (VTID-05166)', () => {
  it('every new key has exactly one version, v1, locked as draft', () => {
    for (const k of C3_KEYS) expect(lock.texts[k], k).toEqual({ v1: { status: 'draft' } });
  });

  it('v1 is visibly a draft in every locale and never displayable', () => {
    for (const k of C3_KEYS) {
      for (const loc of CONSENT_LOCALES) {
        const texts = readConsentTexts(shards[loc], k, 'v1');
        expect(texts, `${k} ${loc}`).toBeTruthy();
        expect(texts!.title.startsWith(DRAFT_MARKER), `${k} ${loc}`).toBe(true);
        expect(resolveConsentWording(k, 'v1', CONSENT_LOCALE_TAGS[loc]), `${k} ${loc}`).toEqual({ status: 'draft' });
      }
    }
  });

  it('sync_* wording names the source ({name}); the self-logged wording names none', () => {
    for (const loc of CONSENT_LOCALES) {
      for (const k of HEALTH_SYNC_CONSENT_KEYS) {
        const tx = readConsentTexts(shards[loc], k, 'v1')!;
        for (const part of [tx.title, tx.body, tx.checkbox]) expect(placeholders(part), `${k} ${loc}`).toEqual(['{name}']);
      }
      const self = readConsentTexts(shards[loc], 'self_logged_health', 'v1')!;
      for (const part of [self.title, self.body, self.checkbox]) expect(placeholders(part), `self_logged_health ${loc}`).toEqual([]);
    }
  });

  it('chrome labels exist in all 11 locales: category names, section headings, phone stores', () => {
    for (const loc of CONSENT_LOCALES) {
      const u = ui(loc);
      const cats = u.categories as Record<string, string>;
      for (const k of HEALTH_SYNC_CONSENT_KEYS) expect(placeholders(cats[k] ?? ''), `${k} ${loc}`).toEqual(['{name}']);
      expect(typeof cats.self_logged_health === 'string' && cats.self_logged_health.length > 0, loc).toBe(true);
      expect(placeholders(cats.self_logged_health), loc).toEqual([]);
      for (const h of ['healthSyncHeading', 'selfLoggedHeading']) expect(String(u[h] ?? '').trim().length, `${h} ${loc}`).toBeGreaterThan(0);
      expect(u.phoneStores, loc).toEqual({ apple_health: 'Apple Health', health_connect: 'Health Connect' });
    }
  });

  it('DE (source of truth) is du-form — no Sie/Ihr/Ihnen', () => {
    const u = ui('de');
    const strings = [
      ...C3_KEYS.flatMap((k) => Object.values(readConsentTexts(shards.de, k, 'v1')!)),
      ...C3_KEYS.map((k) => (u.categories as Record<string, string>)[k]),
      String(u.healthSyncHeading),
      String(u.selfLoggedHeading),
    ];
    for (const s of strings) expect(s, s).not.toMatch(/\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b/);
  });
});

describe('listConsentSources — Health Sync rows (VTID-05166)', () => {
  const base = (over: Partial<HealthConsentsState> = {}): HealthConsentsState => ({
    store_pending: false,
    categories: [],
    consents: [],
    partners: [],
    connectors: [{ id: 'terra', display_name: 'Terra' }],
    ...over,
  });
  const cat = (key: string) =>
    ({ key, resource_type: 'x', scope: 'x', per_resource: true, current_text_version: 'v1', processing_active: true, sort: 0 }) as HealthConsentsState['categories'][number];
  const row = (category: string, resource_id: string, active = true) =>
    ({ category, resource_id, active, granted_at: null, revoked_at: null, granted_via: null, text_version: 'v1', shown_locale: 'de' }) as HealthConsentsState['consents'][number];

  it('no Health Sync rows while the catalogue does not carry the keys', () => {
    expect(listConsentSources(base()).filter((s) => s.category !== 'wearables')).toEqual([]);
  });

  it('one row per catalogued sync key and phone store, plus self_logged_health', () => {
    const sources = listConsentSources(base({ categories: [cat('sync_sleep'), cat('self_logged_health')] }), (s) => `N:${s}`);
    expect(sources.filter((s) => s.category !== 'wearables')).toEqual([
      { category: 'sync_sleep', id: 'apple_health', name: 'N:apple_health' },
      { category: 'sync_sleep', id: 'health_connect', name: 'N:health_connect' },
      { category: 'self_logged_health', id: 'self_logged_health', name: '' },
    ]);
  });

  it('an active consent is always listed (aggregator by its connector name), an inactive one is not', () => {
    const sources = listConsentSources(
      base({ consents: [row('sync_body', 'terra'), row('sync_body', 'apple_health'), row('sync_heart', 'health_connect', false)] }),
      (s) => `N:${s}`,
    );
    expect(sources.filter((s) => s.category !== 'wearables')).toEqual([
      { category: 'sync_body', id: 'terra', name: 'Terra' },
      { category: 'sync_body', id: 'apple_health', name: 'N:apple_health' },
    ]);
  });
});
