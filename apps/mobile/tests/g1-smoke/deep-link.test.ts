/**
 * VTID-05248 — G1 Wave-1 exit path, smoke (c): deep links.
 *
 * EVERY universal link in `LINK_PATHS` (app.config.ts) resolves through the
 * REAL `resolveLink` (resolve-link.ts) AND routes through the REAL
 * `createLinkRouter` (link-router.ts), with auth and invite links delivered to
 * the REAL `auth-port` channels (auth-port.ts):
 *   exact:   /auth/confirmed   → auth
 *            /reset-password   → auth
 *            /oauth/complete   → oauth_return (delivered as an auth link)
 *   prefix:  /i/<code>         → invite
 *
 * Pure resolution and routing: no network, no fixture needed. No module is
 * modified; the smoke only imports them.
 */
import { LINK_PATHS } from '../../app.config';
import { resolveLink, type ResolvedLink } from '../../src/linking/resolve-link';
import { createLinkRouter } from '../../src/linking/link-router';
import {
  deliverAuthLink,
  deliverInviteLink,
  onAuthLink,
  onInviteLink,
  resetAuthPort,
  setSession,
  type AuthLink,
  type InviteLink,
} from '../../src/linking/auth-port';

const HOST = 'vitanaland.com';
const LINK_HOSTS = [HOST];

/** A concrete universal link for each LINK_PATHS entry, with the kind it must resolve to. */
const UNIVERSAL_LINKS: Array<{ path: string; url: string; kind: ResolvedLink['kind'] }> = [
  { path: '/auth/confirmed', url: `https://${HOST}/auth/confirmed#access_token=tok&type=signup`, kind: 'auth' },
  { path: '/reset-password', url: `https://${HOST}/reset-password#access_token=tok&type=recovery`, kind: 'auth' },
  { path: '/oauth/complete', url: `https://${HOST}/oauth/complete?code=xyz`, kind: 'oauth_return' },
  { path: '/i/', url: `https://${HOST}/i/ABC123`, kind: 'invite' },
];

describe('G1 smoke (c) — every LINK_PATHS universal link resolves and routes', () => {
  afterEach(() => resetAuthPort());

  it('the fixtures cover every LINK_PATHS entry (nothing drifts out of scope)', () => {
    const covered = new Set(UNIVERSAL_LINKS.map((l) => l.path));
    for (const exact of LINK_PATHS.exact) expect(covered.has(exact)).toBe(true);
    for (const prefix of LINK_PATHS.prefix) expect(covered.has(prefix)).toBe(true);
    expect(covered.size).toBe(LINK_PATHS.exact.length + LINK_PATHS.prefix.length);
  });

  it.each(UNIVERSAL_LINKS)('resolveLink maps $path to kind $kind', ({ url, kind }) => {
    const resolved = resolveLink(url, { linkHosts: LINK_HOSTS });
    expect(resolved).not.toBeNull();
    expect(resolved!.kind).toBe(kind);
  });

  it('the link router delivers auth links to onAuthLink and never routes them', () => {
    setSession({ accessToken: 'jwt' });
    const navigate = jest.fn();
    const received: AuthLink[] = [];
    const unsub = onAuthLink((l) => received.push(l));
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => true });
    router.attachNavigator(navigate);

    for (const { url, kind } of UNIVERSAL_LINKS.filter((l) => l.kind === 'auth' || l.kind === 'oauth_return')) {
      const out = router.handleLink(url);
      expect(out!.kind).toBe(kind);
    }
    unsub();

    // /auth/confirmed, /reset-password and /oauth/complete all land on the auth port.
    expect(received.map((l) => l.kind)).toEqual(['auth', 'auth', 'oauth_return']);
    // Auth links are never pushed as a route, and nothing is held.
    expect(navigate).not.toHaveBeenCalled();
    expect(router.heldHref()).toBeNull();
  });

  it('the link router delivers an invite link to onInviteLink with its code', () => {
    const received: InviteLink[] = [];
    const unsub = onInviteLink((l) => received.push(l));
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => true });
    router.attachNavigator(jest.fn());

    const out = router.handleLink(`https://${HOST}/i/ABC123`);
    expect(out).toMatchObject({ kind: 'invite', code: 'ABC123' });
    unsub();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ kind: 'invite', code: 'ABC123' });
  });

  it('the resolved auth/invite links deliver through the auth-port channels directly', () => {
    const auth: AuthLink[] = [];
    const invites: InviteLink[] = [];
    onAuthLink((l) => auth.push(l));
    onInviteLink((l) => invites.push(l));

    for (const { url } of UNIVERSAL_LINKS) {
      const resolved = resolveLink(url, { linkHosts: LINK_HOSTS })!;
      if (resolved.kind === 'auth' || resolved.kind === 'oauth_return') deliverAuthLink(resolved);
      if (resolved.kind === 'invite') deliverInviteLink(resolved);
    }

    expect(auth.map((l) => l.kind)).toEqual(['auth', 'auth', 'oauth_return']);
    expect(invites).toHaveLength(1);
    expect(invites[0].code).toBe('ABC123');
  });
});
