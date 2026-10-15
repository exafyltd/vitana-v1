/**
 * VTID-05221 — client validators for the "New community" panel mirror the
 * gateway's ProvisionTenantSchema / TenantBrandPackPatchSchema.
 */
import { describe, expect, it } from 'vitest';
import reserved from '@/generated/reserved-tenant-slugs.json';
import {
  buildBrandPackPatch,
  buildProvisionBody,
  emptyBrandPackForm,
  emptyProvisionForm,
  isReservedTenantSlug,
  JEV_BUDGET_MAX_USD,
  TENANT_SLUG_RE,
  validateBrandPackForm,
  validateBudget,
  validateCurrency,
  validateEmail,
  validateHexColor,
  validateLocaleList,
  validateProvisionForm,
  validateSlug,
} from './validation';

describe('slug', () => {
  it('uses the gateway SLUG_RE byte for byte', () => {
    expect(TENANT_SLUG_RE.source).toBe('^[a-z][a-z0-9]*(-[a-z0-9]+)*$');
  });

  it.each(['abc', 'longevity-club', 'a1-b2-c3', 'club2026'])('accepts %s', (s) => {
    expect(validateSlug(s)).toBeNull();
  });

  it.each([
    ['', 'required'],
    ['ab', 'slugLength'],
    ['a'.repeat(33), 'slugLength'],
    ['1club', 'slugFormat'],
    ['Club', 'slugFormat'],
    ['my--club', 'slugFormat'],
    ['club-', 'slugFormat'],
    ['-club', 'slugFormat'],
    ['my_club', 'slugFormat'],
    ['my club', 'slugFormat'],
  ])('rejects %j as %s', (s, key) => {
    expect(validateSlug(s)).toBe(key);
  });

  it('rejects every reserved slug and accepts the legacy tenant routes', () => {
    for (const s of ['admin', 'api', 'community', 'commerce', 'wallet']) {
      expect(isReservedTenantSlug(s), s).toBe(true);
      expect(validateSlug(s), s).toBe('slugReserved');
    }
    for (const s of reserved.reserved.filter((r) => TENANT_SLUG_RE.test(r) && r.length >= 3 && r.length <= 32)) {
      expect(validateSlug(s), s).toBe('slugReserved');
    }
    for (const s of reserved.legacy_tenant_routes) expect(isReservedTenantSlug(s), s).toBe(false);
  });
});

describe('email', () => {
  it.each(['admin@example.com', ' a.b+c@sub.example.org '])('accepts %j', (e) => {
    expect(validateEmail(e, true)).toBeNull();
  });
  it.each(['admin', 'admin@example', 'a b@example.com', '@example.com', `${'a'.repeat(250)}@x.io`])('rejects %j', (e) => {
    expect(validateEmail(e, true)).toBe('email');
  });
  it('empty is required only for required fields', () => {
    expect(validateEmail('', true)).toBe('required');
    expect(validateEmail('  ', false)).toBeNull();
  });
});

describe('hex colours', () => {
  it.each(['#000000', '#A1b2C3', '#ffffff'])('accepts %s', (c) => expect(validateHexColor(c)).toBeNull());
  it.each(['000000', '#fff', '#12345g', '#1234567', 'red', 'rgb(0,0,0)'])('rejects %s', (c) =>
    expect(validateHexColor(c)).toBe('hexColor'),
  );
  it('empty is "not set"', () => expect(validateHexColor('')).toBeNull());

  it('needs all three colours once one is set', () => {
    const v = { ...emptyBrandPackForm(), colorAccent: '#112233' };
    const errors = validateBrandPackForm(v, false);
    expect(errors.colorBg).toBe('colorsIncomplete');
    expect(errors.colorFg).toBe('colorsIncomplete');
    expect(errors.colorAccent).toBeUndefined();
  });
});

describe('Jev monthly budget', () => {
  it('limit matches the gateway', () => expect(JEV_BUDGET_MAX_USD).toBe(500));
  it.each(['', '0', '1', '250.5', '500'])('accepts %j', (b) => expect(validateBudget(b)).toBeNull());
  it.each(['-1', '500.01', '501', 'abc', '1e3', '10 USD'])('rejects %j', (b) => expect(validateBudget(b)).toBe('budgetRange'));
});

describe('locales and currency', () => {
  it('accepts a comma separated locale list and rejects bad codes', () => {
    expect(validateLocaleList('de, en, pt-BR')).toBeNull();
    expect(validateLocaleList('de, EN')).toBe('localeList');
    expect(validateLocaleList(Array.from({ length: 21 }, () => 'de').join(','))).toBe('localeList');
  });
  it('currency is ISO 4217 upper case', () => {
    expect(validateCurrency('EUR')).toBeNull();
    expect(validateCurrency('eur')).toBe('currency');
    expect(validateCurrency('EURO')).toBe('currency');
  });
});

describe('provision form', () => {
  const filled = {
    ...emptyProvisionForm(),
    slug: 'longevity-club',
    name: ' Longevity Club ',
    adminEmail: 'owner@example.com',
    allMembersGroupName: 'Alle Mitglieder',
  };

  it('requires slug, name, admin email and all-members group name', () => {
    expect(Object.keys(validateProvisionForm(emptyProvisionForm())).sort()).toEqual(
      ['adminEmail', 'allMembersGroupName', 'name', 'slug'].sort(),
    );
    expect(validateProvisionForm(filled)).toEqual({});
  });

  it('builds a body with only the schema fields that were set', () => {
    expect(buildProvisionBody(filled)).toEqual({
      slug: 'longevity-club',
      name: 'Longevity Club',
      admin_email: 'owner@example.com',
      all_members_group_name: 'Alle Mitglieder',
    });
    expect(
      buildProvisionBody({
        ...filled,
        displayName: 'Longevity',
        defaultLocale: 'de',
        enabledLocales: 'de, en',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        jevBudget: '0',
      }),
    ).toEqual({
      slug: 'longevity-club',
      name: 'Longevity Club',
      admin_email: 'owner@example.com',
      all_members_group_name: 'Alle Mitglieder',
      display_name: 'Longevity',
      default_locale: 'de',
      enabled_locales: ['de', 'en'],
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      jev_monthly_budget_usd: 0,
    });
  });
});

describe('brand pack form', () => {
  it('an empty form is "nothing to update" and builds an empty patch', () => {
    expect(validateBrandPackForm(emptyBrandPackForm(), false)).toEqual({ form: 'nothingToUpdate' });
    expect(buildBrandPackPatch(emptyBrandPackForm(), false)).toEqual({});
  });

  it('open sign-up is off and not sent until the admin touches it', () => {
    const v = emptyBrandPackForm();
    expect(v.openSignup).toBe(false);
    expect(buildBrandPackPatch({ ...v, legalEntityLine: 'X GmbH' }, false)).toEqual({ legal_entity_line: 'X GmbH' });
    expect(buildBrandPackPatch({ ...v, openSignup: false, openSignupTouched: true }, false)).toEqual({ open_signup: false });
  });

  it('needs the anchor name when any anchor field is set', () => {
    expect(validateBrandPackForm({ ...emptyBrandPackForm(), anchorRole: 'Gründerin' }, false).anchorName).toBe(
      'anchorNameRequired',
    );
  });

  it('limits fact lists to 8 entries of 200 characters', () => {
    const v = emptyBrandPackForm();
    expect(validateBrandPackForm({ ...v, storyFacts: Array.from({ length: 9 }, (_, i) => `f${i}`).join('\n') }, false).storyFacts).toBe(
      'factListTooLong',
    );
    expect(validateBrandPackForm({ ...v, tone: 'x'.repeat(201) }, false).tone).toBe('factTooLong');
  });

  it('requires a 10–500 character override reason only after the server asked for it', () => {
    const v = { ...emptyBrandPackForm(), openSignup: true, openSignupTouched: true };
    expect(validateBrandPackForm(v, false).overrideReason).toBeUndefined();
    expect(validateBrandPackForm(v, true).overrideReason).toBe('overrideReasonLength');
    expect(validateBrandPackForm({ ...v, overrideReason: 'short' }, true).overrideReason).toBe('overrideReasonLength');
    const ok = { ...v, overrideReason: 'Owner launch event today' };
    expect(validateBrandPackForm(ok, true)).toEqual({});
    expect(buildBrandPackPatch(ok, true)).toEqual({ open_signup: true, override_reason: 'Owner launch event today' });
    expect(buildBrandPackPatch(ok, false)).toEqual({ open_signup: true });
  });
});
