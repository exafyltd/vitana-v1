/**
 * VTID-05650 (native-wave2-fix-forward-r2/public-entry) — an invite link
 * navigates to the public `/i/<code>` route without waiting for a session
 * (web src/App.tsx:877 is public), cold start and warm, and is still delivered
 * to the auth port. Other routes keep the sign-in hold.
 */
import { createLinkRouter } from '../../src/linking/link-router';
import { onInviteLink, resetAuthPort, type InviteLink } from '../../src/linking/auth-port';

const HOST = 'vitanaland.com';
const LINK_HOSTS = [HOST];

describe('invite links through the link router', () => {
  afterEach(() => resetAuthPort());

  it('cold start, signed out: the navigator gets /i/ABC123 on attach', () => {
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => false });
    const navigate = jest.fn();
    router.handleLink(`https://${HOST}/i/ABC123`);
    expect(navigate).not.toHaveBeenCalled();
    router.attachNavigator(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/i/ABC123');
    // The slot is cleared once it navigated: a second attach does not replay it.
    const again = jest.fn();
    router.attachNavigator(again);
    expect(again).not.toHaveBeenCalled();
  });

  it('warm link, signed out: navigates at once', () => {
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => false });
    const navigate = jest.fn();
    router.attachNavigator(navigate);
    router.handleLink(`https://${HOST}/i/ABC123`);
    expect(navigate).toHaveBeenCalledWith('/i/ABC123');
  });

  it('the auth port still receives the invite', () => {
    const received: InviteLink[] = [];
    onInviteLink((l) => received.push(l));
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => false });
    router.attachNavigator(jest.fn());
    router.handleLink(`https://${HOST}/i/ABC123`);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ kind: 'invite', code: 'ABC123' });
  });

  it('the latest invite wins while no navigator is attached', () => {
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => false });
    const navigate = jest.fn();
    router.handleLink(`https://${HOST}/i/FIRST1`);
    router.handleLink(`https://${HOST}/i/SECOND2`);
    router.attachNavigator(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/i/SECOND2');
  });

  it('a non-invite link still waits for sign-in (held / flush unchanged)', () => {
    let signedIn = false;
    const router = createLinkRouter({ linkHosts: LINK_HOSTS, isSignedIn: () => signedIn });
    const navigate = jest.fn();
    router.attachNavigator(navigate);
    router.handleLink(`https://${HOST}/privacy`);
    expect(navigate).not.toHaveBeenCalled();
    expect(router.heldHref()).not.toBeNull();
    signedIn = true;
    router.onSignedIn();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
