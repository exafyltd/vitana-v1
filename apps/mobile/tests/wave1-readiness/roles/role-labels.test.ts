/**
 * VTID-05684 — Wave 1 readiness (roles, R1): role labels in all 11 locales.
 * Readiness evidence only; does not prove the Wave 1 exit (needs G1).
 * Subject: src/shell/logic/role-labels.ts:7 ROLE_LABEL_KEY, :18 roleLabel.
 */
import '../../helpers/no-network';
import { ROLE_LABEL_KEY, roleLabel } from '../../../src/shell/logic/role-labels';
import { ROLE_LADDER } from '../../../src/ports/core';
import { LOCALES, catalogs, translate, type Locale } from '../../../src/i18n';

/** The catalog value for a dotted key in ONE locale, with no fallback to `de`. */
function own(locale: Locale, key: string): unknown {
  let v: unknown = catalogs[locale];
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && part in (v as Record<string, unknown>)) v = (v as Record<string, unknown>)[part];
    else return undefined;
  }
  return v;
}

describe('ROLE_LABEL_KEY (role-labels.ts:7)', () => {
  it('has an entry for every role in ROLE_LADDER', () => {
    expect(ROLE_LADDER).toHaveLength(8);
    for (const role of ROLE_LADDER) expect(typeof ROLE_LABEL_KEY[role]).toBe('string');
    expect(Object.keys(ROLE_LABEL_KEY).sort()).toEqual([...ROLE_LADDER].sort());
  });

  it('uses one distinct screens.mobile.* key per role', () => {
    const keys = ROLE_LADDER.map((r) => ROLE_LABEL_KEY[r]);
    expect(new Set(keys).size).toBe(ROLE_LADDER.length);
    for (const k of keys) expect(k).toMatch(/^screens\.mobile\.role[A-Z]/);
  });
});

describe('roleLabel in the 11 locales (role-labels.ts:18)', () => {
  it('runs over all 11 shipped locales', () => {
    expect([...LOCALES]).toEqual(['de', 'en', 'es', 'sr', 'fr', 'pl', 'pt', 'ru', 'tr', 'zh', 'ar']);
  });

  describe.each([...LOCALES])('%s', (locale) => {
    const t = (key: string) => translate(locale, key);

    it.each([...ROLE_LADDER])('%s: translated, non-empty, not the key', (role) => {
      const key = ROLE_LABEL_KEY[role];
      const label = roleLabel(t, role);
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toBe(key);
      expect(label).not.toBe(role);
      // The locale carries its own string for the key (not a silent fallback to `de`).
      const value = own(locale, key);
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
      expect(label).toBe(value);
    });

    it('labels are distinct per role', () => {
      const labels = ROLE_LADDER.map((r) => roleLabel(t, r));
      expect(new Set(labels).size).toBe(ROLE_LADDER.length);
    });
  });

  it('an unknown role returns the role string unchanged', () => {
    const t = (key: string) => translate('de', key);
    expect(roleLabel(t, 'org_admin')).toBe('org_admin');
    expect(roleLabel(t, '')).toBe('');
  });

  it('does not call t for an unknown role', () => {
    const t = jest.fn((k: string) => k);
    roleLabel(t, 'reseller');
    expect(t).not.toHaveBeenCalled();
  });
});
