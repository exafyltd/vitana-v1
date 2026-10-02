/**
 * VTID-04791 — the supplier sign-up leads with the fastest options and the
 * public Commerce page speaks the supplier's language. Source and catalog
 * checks, same style as CommerceJoin.routing.test.ts.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const join = readFileSync(resolve(__dirname, './CommerceJoin.tsx'), 'utf8');
const portal = readFileSync(resolve(__dirname, './CommercePortal.tsx'), 'utf8');
const de = JSON.parse(readFileSync(resolve(__dirname, '../i18n/de/screens.json'), 'utf8')).screens.commerceportal;
const en = JSON.parse(readFileSync(resolve(__dirname, '../i18n/en/screens.json'), 'utf8')).screens.commerceportal;

describe('CommerceJoin: providers first, email on demand (VTID-04791)', () => {
  it('offers only providers the app already uses — Google and Apple, no unconfigured Microsoft', () => {
    const list = join.slice(join.indexOf('export const COMMERCE_OAUTH_PROVIDERS'), join.indexOf('const PROVIDER_NAME'));
    expect(list).toContain("id: 'google'");
    expect(list).toContain("id: 'apple'");
    expect(list).not.toContain("id: 'azure'");
    expect(list).not.toContain("id: 'facebook'");
  });

  it('signs in through the shared WebView-aware OAuth hook, back into the Commerce Portal as maxina', () => {
    expect(join).toContain('useSupabaseOAuthSignIn');
    // VTID-04832: back to the host it started on, never hardcoded production.
    expect(join).toContain('redirectTo: oauthReturnUrl(targetPath())');
    expect(join).toContain('rememberCommerceOAuth();');
    expect(join).toContain("queryParams: { tenant_slug: 'maxina' }");
  });

  it('keeps email + password, behind "Continue with email" — no magic link', () => {
    expect(join).toContain("useState<'choose' | 'email'>('choose')");
    expect(join).toContain("t('screens.commerceportal.join.continueWithEmail')");
    expect(join).toContain('supabase.auth.signUp(');
    expect(join).toContain('supabase.auth.signInWithPassword(');
    expect(join).not.toContain('signInWithOtp');
  });

  it('no longer sends suppliers to the old dark sign-in page', () => {
    expect(join).not.toContain('/commerce-login');
    expect(de.join.otherSignin).toBeUndefined();
    expect(en.join.otherSignin).toBeUndefined();
  });

  it('says "sign in" for signing in — in German too, where "anmelden" meant both', () => {
    expect(en.join.haveAccount).toBe('Already have an account? Sign in');
    expect(de.join.haveAccount).toContain('Einloggen');
    expect(de.join.signinCta).toBe('Einloggen');
    expect(de.guestCta).not.toMatch(/anmelden/i);
  });

  it('every new string exists in DE and EN, German in du-form', () => {
    for (const k of ['title', 'signinTitle', 'continueWithGoogle', 'continueWithApple', 'continueWithEmail', 'or', 'allOptions', 'oauthFailed']) {
      expect(typeof de.join[k]).toBe('string');
      expect(typeof en.join[k]).toBe('string');
      expect(de.join[k]).not.toMatch(/\b(Sie|Ihr|Ihnen|Ihre)\b/);
    }
    expect(de.join.oauthFailed).toContain('{provider}');
    expect(en.join.oauthFailed).toContain('{provider}');
  });
});

describe('Public Commerce page: the supplier journey, not the integration pipeline (VTID-04791)', () => {
  it('pitches reach, with one CTA and a small "free, about a minute" hint', () => {
    expect(en.heroTitle).toBe('Bring your business to Vitanaland');
    expect(en.heroSubtitle).toBe('Reach Vitanaland customers with your products and services.');
    expect(en.guestCta).toBe('Join Vitanaland Commerce');
    expect(en.guestCtaHint).toBe('Free to register · Takes about 1 minute');
    expect(portal).toContain("t('screens.commerceportal.guestCtaHint')");
  });

  it('the three steps are account → products → verification, with no technical terms', () => {
    expect(en.howItWorksTitle).toBe('Getting started is simple');
    expect([en.step1Title, en.step2Title, en.step3Title]).toEqual([
      'Create your supplier account',
      'Add your products or services',
      'Get verified & go live',
    ]);
    const steps = [1, 2, 3].flatMap((n) => [en[`step${n}Title`], en[`step${n}Body`], de[`step${n}Title`], de[`step${n}Body`]]);
    for (const s of steps) expect(s).not.toMatch(/OpenAPI|mapping|sandbox|Mapping|Freigabe|interface|Schnittstelle/);
  });

  it('keeps the reassurance that checks are never skipped', () => {
    expect(en.footNote).toBe('Security, compliance and certification checks are never skipped.');
    expect(de.footNote).toMatch(/nie übersprungen/);
  });
});
