/**
 * VTID-03936. Source checks in the same style as `CommerceJoin.routing.test.ts`
 * — facts about `App.tsx`'s wiring and the redirect-back-after-login path an
 * org invite link depends on, rather than a render test of a 1800-line router.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const join = readFileSync(resolve(__dirname, './CommerceJoin.tsx'), 'utf8');

describe('the org invite accept route', () => {
  it('is registered and guarded — an invite link needs a session, same as the rest of the portal', () => {
    const line = app.split('\n').find((l) => l.includes('path="/commerce/invites/:token/accept"'));
    expect(line).toBeDefined();
    expect(line).toContain('AuthGuard');
    expect(line).toContain('CommerceAcceptInvite');
  });
});

describe('CommerceJoin honors redirectTo (VTID-03936)', () => {
  it('reads redirectTo from the URL instead of always landing on the generic portal', () => {
    expect(join).toContain("searchParams.get('redirectTo')");
  });

  it('only follows a /commerce path — never an open redirect to an arbitrary URL', () => {
    expect(join).toContain("redirectTo.startsWith('/commerce')");
  });
});

describe('invite bound to the invited email (VTID-04337)', () => {
  const page = readFileSync(resolve(__dirname, './CommerceAcceptInvite.tsx'), 'utf8');
  const de = JSON.parse(readFileSync(resolve(__dirname, '../i18n/de/screens.json'), 'utf8'));
  const en = JSON.parse(readFileSync(resolve(__dirname, '../i18n/en/screens.json'), 'utf8'));

  it('maps the gateway 403 codes to their own state instead of the generic failure', () => {
    expect(page).toContain("/INVITE_EMAIL_(MISMATCH|UNVERIFIED)/");
    const mismatchIdx = page.indexOf('INVITE_EMAIL_(MISMATCH|UNVERIFIED)');
    const failedIdx = page.indexOf("else setState('failed')");
    expect(mismatchIdx).toBeGreaterThan(-1);
    expect(mismatchIdx).toBeLessThan(failedIdx);
  });

  it('renders a catalog string, present in DE and EN', () => {
    expect(page).toContain("t('screens.commerceportal.orgOnboarding.acceptWrongEmail')");
    expect(de.screens.commerceportal.orgOnboarding.acceptWrongEmail).toMatch(/E-Mail-Adresse/);
    expect(en.screens.commerceportal.orgOnboarding.acceptWrongEmail).toMatch(/email address/);
  });
});
