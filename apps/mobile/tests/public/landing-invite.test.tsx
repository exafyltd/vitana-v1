/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the
 * PUBLIC.LANDING storefront (signed out: the five portal cards and where each
 * goes; resolving: a loader; signed in: on to /home) and the `/i/:code` invite
 * landing: the link resolves to `invite` through resolve-link.ts, the
 * delivered code (auth-port.ts) is remembered and the friend lands on the
 * Join tab. Fixtures only, no network, no auth write.
 */
import '../helpers/no-network';
import { resetMocks, router, publicWrapper } from './helpers';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { translate } from '../../src/i18n';
import { getToasts, __resetToasts } from '../../src/ui/toast/store';
import { PublicLandingScreen, PORTAL_IDS, commandHubUrl } from '../../src/screens/public/PublicLandingScreen';
import { InviteLandingScreen, INVITE_TARGET } from '../../src/screens/public/InviteLandingScreen';
import { clearInviteCode, readInviteCode, rememberInviteCode, INVITE_MAX_AGE_MS } from '../../src/screens/public/invite';
import { resolveLink } from '../../src/linking/resolve-link';
import { deliverInviteLink, resetAuthPort } from '../../src/linking/auth-port';
import { createLinkRouter } from '../../src/linking/link-router';

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  resetMocks();
  __resetToasts();
  clearInviteCode();
  resetAuthPort();
});

describe('PUBLIC.LANDING (/)', () => {
  it('signed out: the VITANA wordmark, the intro lines, five portal cards and the footer', async () => {
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<PublicLandingScreen gatewayUrl={null} />, { wrapper });
    expect(await screen.findByTestId('public-landing')).toBeTruthy();
    expect(screen.getByText('VITANA')).toBeTruthy();
    expect(screen.getByText(translate('en', 'screens.index.digitalSolutionsForYourWellnessJourney'))).toBeTruthy();
    expect(PORTAL_IDS).toEqual(['maxina', 'alkalma', 'exafy-admin', 'dev', 'commerce']);
    for (const id of PORTAL_IDS) expect(screen.getByTestId(`landing-portal-${id}`)).toBeTruthy();
    expect(screen.getByText(translate('en', 'screens.index.vitanaComprehensiveDigitalHealthPlatformOffering'))).toBeTruthy();
  });

  it('Maxina opens the intro keeping the query; AlKalma, Exafy Admin and Commerce go to their web paths', async () => {
    resetMocks({ utm_source: 'ig', redirectTo: '/home' });
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<PublicLandingScreen gatewayUrl={null} />, { wrapper });
    fireEvent.press(await screen.findByTestId('landing-portal-maxina'));
    expect(router.navigate).toHaveBeenLastCalledWith('/_intro/maxina?utm_source=ig&redirectTo=%2Fhome');
    fireEvent.press(screen.getByTestId('landing-portal-alkalma'));
    expect(router.navigate).toHaveBeenLastCalledWith('/alkalma');
    fireEvent.press(screen.getByTestId('landing-portal-commerce'));
    expect(router.navigate).toHaveBeenLastCalledWith('/commerce-login');
  });

  it('Vitana DEV without a gateway shows the web "not configured" error; with one it opens the Command Hub', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { wrapper } = publicWrapper({ language: 'en-US' });
    const view = render(<PublicLandingScreen gatewayUrl={null} />, { wrapper });
    fireEvent.press(await screen.findByTestId('landing-portal-dev'));
    expect(getToasts().map((t) => [t.kind, t.titleKey])).toEqual([['error', 'toasts.index.vitanaDevGatewayUrlNotConfigured']]);
    expect(open).not.toHaveBeenCalled();
    view.unmount();
    render(<PublicLandingScreen gatewayUrl="https://g1-gateway.example.org/" />, { wrapper });
    fireEvent.press(await screen.findByTestId('landing-portal-dev'));
    expect(open).toHaveBeenCalledWith('https://g1-gateway.example.org/command-hub/');
    expect(commandHubUrl('https://x.example.org//')).toBe('https://x.example.org/command-hub/');
    open.mockRestore();
  });

  it('signed in: never paints the grid, goes on to /home', async () => {
    const { wrapper } = publicWrapper({ signedIn: true });
    render(<PublicLandingScreen gatewayUrl={null} />, { wrapper });
    expect((await screen.findByTestId('redirect')).props.children).toBe('/home');
    expect(screen.queryByTestId('public-landing')).toBeNull();
  });
});

describe('/i/:code invite landing', () => {
  it('resolve-link tags /i/:code as invite (path, https link host and maxina://)', () => {
    for (const input of ['/i/abc123', 'https://vitanaland.com/i/abc123', 'maxina://i/abc123']) {
      expect(resolveLink(input)).toMatchObject({ kind: 'invite', code: 'abc123' });
    }
  });

  it('a delivered invite link (link router → auth-port) is remembered and the friend lands on Join', async () => {
    const linkRouter = createLinkRouter({ linkHosts: [], isSignedIn: () => false });
    linkRouter.handleLink('https://vitanaland.com/i/FRIEND42');
    const { wrapper } = publicWrapper();
    render(<InviteLandingScreen />, { wrapper });
    expect((await screen.findByTestId('redirect')).props.children).toBe(INVITE_TARGET);
    expect(INVITE_TARGET).toBe('/maxina?tab=signup');
    expect(readInviteCode()).toBe('friend42');
  });

  it('a pending delivered link wins over the route param; in-app navigation uses the param', async () => {
    deliverInviteLink({ kind: 'invite', code: 'delivered1', pathname: '/i/delivered1', params: {} });
    resetMocks({ code: 'param0001' });
    const { wrapper } = publicWrapper();
    const a = render(<InviteLandingScreen />, { wrapper });
    await screen.findByTestId('redirect');
    expect(readInviteCode()).toBe('delivered1');
    a.unmount();
    clearInviteCode();
    render(<InviteLandingScreen />, { wrapper });
    await screen.findByTestId('redirect');
    expect(readInviteCode()).toBe('param0001');
  });

  it('a link delivered while the screen is open is remembered too', async () => {
    resetMocks({ code: 'first0001' });
    const { wrapper } = publicWrapper();
    render(<InviteLandingScreen />, { wrapper });
    await screen.findByTestId('redirect');
    act(() => deliverInviteLink({ kind: 'invite', code: 'later0001', pathname: '/i/later0001', params: {} }));
    await waitFor(() => expect(readInviteCode()).toBe('later0001'));
  });

  it('keeps only a valid code (web INVITE_CODE_PATTERN) and drops it after 14 days', () => {
    expect(rememberInviteCode('bad!')).toBe(false);
    expect(readInviteCode()).toBeNull();
    expect(rememberInviteCode('  AbC123  ', 1000)).toBe(true);
    expect(readInviteCode(1000)).toBe('abc123');
    expect(readInviteCode(1000 + INVITE_MAX_AGE_MS + 1)).toBeNull();
    expect(readInviteCode(1000)).toBeNull();
  });

  it('an invalid route code is not kept, the friend still lands on Join', async () => {
    resetMocks({ code: 'x' });
    const { wrapper } = publicWrapper();
    render(<InviteLandingScreen />, { wrapper });
    expect((await screen.findByTestId('redirect')).props.children).toBe('/maxina?tab=signup');
    expect(readInviteCode()).toBeNull();
  });
});
