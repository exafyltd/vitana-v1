// VTID-05185 — Native Wave 1 N5b: the Health Sync OS permission keys.
//
// The native app's HealthKit config plugin resolves
// screens.nativeHealthSync.osPermission.iosShareUsage into
// NSHealthShareUsageDescription for every locale, and the Health Connect
// rationale hand-off uses privacyPolicyTitle. Both must exist, non-empty, in all
// 11 shipped locale shards. Reads the shards from disk (no Vite transform).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar'] as const;

function osPermission(locale: string): Record<string, unknown> | undefined {
  const shard = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n', locale, 'screens.json'), 'utf8'));
  return shard?.screens?.nativeHealthSync?.osPermission;
}

describe('screens.nativeHealthSync.osPermission (VTID-05185)', () => {
  it.each(LOCALES)('%s has both keys, non-empty, nothing pending review', (locale) => {
    const node = osPermission(locale);
    expect(node, `${locale}: screens.nativeHealthSync.osPermission missing`).toBeTruthy();
    expect(Object.keys(node!).sort()).toEqual(['iosShareUsage', 'privacyPolicyTitle']);
    for (const key of ['iosShareUsage', 'privacyPolicyTitle']) {
      const value = node![key];
      expect(typeof value, `${locale}.${key}`).toBe('string');
      expect((value as string).trim().length, `${locale}.${key} is empty`).toBeGreaterThan(0);
    }
    expect(node!.iosShareUsage as string, `${locale}: usage text names Apple Health`).toContain('Apple Health');
  });

  it('every locale is a real translation, not a copy of German or English', () => {
    const de = osPermission('de')!;
    const en = osPermission('en')!;
    for (const locale of LOCALES.filter((l) => l !== 'de' && l !== 'en')) {
      const node = osPermission(locale)!;
      expect(node.iosShareUsage, `${locale} iosShareUsage equals de`).not.toBe(de.iosShareUsage);
      expect(node.iosShareUsage, `${locale} iosShareUsage equals en`).not.toBe(en.iosShareUsage);
    }
  });

  it('German is du-form (no Sie/Ihr/Ihnen/Ihre)', () => {
    for (const value of Object.values(osPermission('de')!)) {
      expect(value as string).not.toMatch(/\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b/);
    }
  });

  it('German words of 22+ characters are hyphenated', () => {
    for (const value of Object.values(osPermission('de')!)) {
      const long = (value as string).split(/[^\p{L}]+/u).filter((w) => w.length >= 22);
      expect(long).toEqual([]);
    }
  });

  it('there is no write-permission text: the app only reads Apple Health', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(osPermission(locale)!)).not.toContain('iosUpdateUsage');
    }
  });
});
