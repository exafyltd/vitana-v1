/**
 * VTID-03894. The supplier link is only as good as its reachability, and both
 * invariants below are one careless edit from being lost — with no visible
 * symptom until a real supplier bounces off a login they cannot pass.
 *
 * Source checks rather than render tests: App.tsx is a 1800-line router and
 * these are facts about its wiring, which is exactly what the repo's existing
 * widget/characterization tests assert this way.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const guard = readFileSync(resolve(__dirname, '../components/AuthGuard.tsx'), 'utf8');

describe('the shareable supplier link', () => {
  it('routes /commerce/join without AuthGuard — it is what an UNREGISTERED supplier opens', () => {
    const line = app.split('\n').find((l) => l.includes('path="/commerce/join"'));
    expect(line).toBeDefined();
    expect(line).not.toContain('AuthGuard');
  });

  it('still guards the portal itself', () => {
    const line = app.split('\n').find((l) => l.includes('path="/commerce"') && l.includes('CommercePortal'));
    expect(line).toContain('AuthGuard');
  });

  it('sends a signed-out visitor on /commerce/* to the commerce front door, not the community login', () => {
    // Without this branch getLoginRoute falls through to the tenant map and
    // returns '/maxina' — a sign-in for a different product entirely.
    expect(guard).toContain("startsWith('/commerce')");
    expect(guard).toContain("return '/commerce/join'");
  });

  it('decides commerce before the tenant fallback, or the branch never runs', () => {
    expect(guard.indexOf("return '/commerce/join'")).toBeLessThan(guard.indexOf("if (slug === 'maxina')"));
  });
});

describe('email confirmation', () => {
  it('lands a confirmed supplier in the portal rather than the community app', () => {
    const redirects = readFileSync(resolve(__dirname, '../utils/redirectUrls.ts'), 'utf8');
    expect(redirects).toContain("commerce: '/commerce?confirmed=true'");
  });

  it('is what the join page actually passes to signUp', () => {
    const join = readFileSync(resolve(__dirname, './CommerceJoin.tsx'), 'utf8');
    expect(join).toContain('CONFIRMATION_PATHS.commerce');
    // Maxina is the only tenant this portal serves; a wrong slug here would
    // land the account in the wrong tenant with no visible error.
    expect(join).toContain("tenant_slug: 'maxina'");
  });
});
