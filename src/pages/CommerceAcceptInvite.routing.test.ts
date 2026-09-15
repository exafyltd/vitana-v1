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
