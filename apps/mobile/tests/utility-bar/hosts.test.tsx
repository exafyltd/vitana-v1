/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the global hosts in
 * `OverlayHost` (web `LifeCompassPopupContext.tsx:14, :32`; `gift-voucher:open`
 * is a native-only event): signed in, `vitana:open-life-compass` opens the
 * Life Compass popup once; `gift-voucher:open` opens the voucher modal with
 * the detail's `returnTo`, or the current path for a missing / non-`/` value;
 * both events are ignored signed out; no modal on iOS. Offline, no network.
 */
import '../helpers/no-network';
import '../discover-commerce/discover-mocks';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { OverlayHost } from '../../src/shell/OverlayHost';
import { GIFT_VOUCHER_OPEN, LIFE_COMPASS_OPEN } from '../../src/shell/utility/events';
import { discoverWrapper } from '../discover-commerce/discover-helpers';

jest.setTimeout(30000);

const realOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

beforeEach(() => setOS('android'));
afterEach(() => {
  setOS(realOS);
  overlayBus.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const emit = (event: string, detail?: unknown) => act(() => overlayBus.emit(event, detail));

async function checkoutReturnTo(db: ReturnType<typeof discoverWrapper>['db']): Promise<unknown> {
  fireEvent.press(await screen.findByTestId('voucher-tier-experience'));
  await act(async () => {
    fireEvent.press(screen.getByTestId('voucher-buy'));
  });
  return (db.invokes.find((i) => i.name === 'stripe-create-voucher-checkout')?.body as { returnTo?: string } | undefined)?.returnTo;
}

describe('OverlayHost — Life Compass and Gift Voucher hosts', () => {
  it('opens the Life Compass popup once for vitana:open-life-compass', async () => {
    const { wrapper } = discoverWrapper({});
    render(<OverlayHost />, { wrapper });
    expect(screen.queryByTestId('life-compass-popup')).toBeNull();
    await emit(LIFE_COMPASS_OPEN);
    expect(await screen.findAllByTestId('life-compass-popup')).toHaveLength(1);
    await emit(LIFE_COMPASS_OPEN);
    expect(screen.getAllByTestId('life-compass-popup')).toHaveLength(1);
  });

  it('opens the voucher modal with the detail returnTo', async () => {
    const { wrapper, db } = discoverWrapper({});
    render(<OverlayHost />, { wrapper });
    await emit(GIFT_VOUCHER_OPEN, { returnTo: '/discover/marketplace' });
    expect(await checkoutReturnTo(db)).toBe('/discover/marketplace');
  });

  it.each([[undefined], [{}], [{ returnTo: 'https://evil.example.org' }], [{ returnTo: 7 }]])('uses the current path when the detail is %p', async (detail) => {
    const { wrapper, db } = discoverWrapper({});
    render(<OverlayHost />, { wrapper });
    await emit(GIFT_VOUCHER_OPEN, detail);
    expect(await checkoutReturnTo(db)).toBe('/discover');
  });

  it('ignores both events signed out', async () => {
    const { wrapper } = discoverWrapper({}, { signedIn: false });
    render(<OverlayHost />, { wrapper });
    await emit(LIFE_COMPASS_OPEN);
    await emit(GIFT_VOUCHER_OPEN, { returnTo: '/home' });
    expect(screen.queryByTestId('life-compass-popup')).toBeNull();
    expect(screen.queryByTestId('voucher-modal')).toBeNull();
  });

  it('opens no voucher modal on iOS (IAP restricted), the popup still opens', async () => {
    setOS('ios');
    const { wrapper } = discoverWrapper({});
    render(<OverlayHost />, { wrapper });
    await emit(GIFT_VOUCHER_OPEN, { returnTo: '/home' });
    expect(screen.queryByTestId('voucher-modal')).toBeNull();
    await emit(LIFE_COMPASS_OPEN);
    expect(await screen.findByTestId('life-compass-popup')).toBeTruthy();
  });

  it('registers both listeners (the ORB open-overlay directive checks listenerCount)', () => {
    const { wrapper } = discoverWrapper({});
    render(<OverlayHost />, { wrapper });
    expect(overlayBus.listenerCount(LIFE_COMPASS_OPEN)).toBe(1);
    expect(overlayBus.listenerCount(GIFT_VOUCHER_OPEN)).toBe(1);
  });
});
