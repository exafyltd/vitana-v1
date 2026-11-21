/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A5) — readiness evidence only; mocks only, no network.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5).
 *
 * Every auth error key resolves to real text in each of the 11 locales, looked up in THAT locale's own catalog
 * (translate() would fall back to `de` and hide a gap): CONFIRMATION_ERROR_KEYS (post-confirm.ts:23), the keys
 * oauthErrorKey returns (sign-in.ts:69), the deadline key (:57) and the resend rate-limit key (:149).
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { LOCALES, catalogs, isRTL, translate } from '../../../src/i18n';
import { CONFIRMATION_ERROR_KEYS } from '../../../src/auth/post-confirm';
import { oauthErrorKey } from '../../../src/auth/sign-in';

function own(locale: string, key: string): string | undefined {
  let v: unknown = (catalogs as Record<string, unknown>)[locale];
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && part in (v as Record<string, unknown>)) v = (v as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

const OAUTH_KEYS = [...new Set(['timed out', 'apple cancelled', 'anything else'].map((m) => oauthErrorKey(new Error(m))))];
const KEYS = [
  ...new Set([...Object.values(CONFIRMATION_ERROR_KEYS), ...OAUTH_KEYS, 'screens.portals.signinTakingLongerThanExpected', 'toasts.auth.tooManyAttemptsPleaseWaitFew']),
];

describe('the key sets', () => {
  it('cover the four confirmation errors and the three oauth keys', () => {
    expect(Object.keys(CONFIRMATION_ERROR_KEYS).sort()).toEqual(['cancelled', 'expired', 'generic', 'signIn']);
    expect(OAUTH_KEYS.sort()).toEqual([
      'screens.portals.signinTakingLongerThanExpected',
      'screens.portals.somethingWentWrong',
      'screens.portals.tryAppleSigninAgain',
    ]);
    expect(KEYS).toHaveLength(8);
  });

  it('the locale list is the 11 GA locales and only ar is RTL', () => {
    expect([...LOCALES].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh']);
    expect(LOCALES.filter(isRTL)).toEqual(['ar']);
  });
});

describe.each([...LOCALES])('auth error keys in %s', (locale) => {
  it.each(KEYS)('%s resolves to real text in this locale’s own catalog', (key) => {
    const text = own(locale, key);
    expect(text).toBeDefined();
    expect(text?.trim()).not.toBe('');
    expect(text).not.toBe(key);
    expect(translate(locale, key)).toBe(text);
  });
});

describe('de (source of truth) is du-form for the auth errors', () => {
  it.each(KEYS)('%s has no Sie/Ihr/Ihnen', (key) => {
    expect(own('de', key)).not.toMatch(/\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihnen)\b/);
  });
});
