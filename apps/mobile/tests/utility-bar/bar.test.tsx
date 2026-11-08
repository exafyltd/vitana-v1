/**
 * VTID-05653 (native-wave2-fix-forward-r2/utility-bar) — the one shared native
 * utility bar (web `utility-action-button.tsx:26-27, :99-125`): slot order
 * children → Life Compass → Gift Voucher → after Gift Voucher → trailing;
 * Gift Voucher is hidden where IAP is restricted (iOS, `isIAPRestricted()`
 * :43); Life Compass and Gift Voucher only emit their bus events, the hosts in
 * `OverlayHost` open the popup / modal (hosts.test.tsx). Offline, no network.
 */
import '../helpers/no-network';
import '../discover-commerce/discover-mocks';
import { Platform, View } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { UtilityBar } from '../../src/shell/utility/UtilityBar';
import { AUTOPILOT_OPEN, GIFT_VOUCHER_OPEN, INDEX_OPEN, LIFE_COMPASS_OPEN } from '../../src/shell/utility/events';
import { discoverWrapper } from '../discover-commerce/discover-helpers';

const realOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

beforeEach(() => {
  overlayBus.clear();
  setOS('android');
});
afterEach(() => setOS(realOS));
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const SLOTS = /^(slot-child|utility-life-compass|utility-gift-voucher|slot-after|slot-trailing)$/;

function renderBar() {
  const { wrapper } = discoverWrapper({});
  return render(
    <UtilityBar afterGiftVoucher={<View testID="slot-after" />} trailing={<View testID="slot-trailing" />}>
      <View testID="slot-child" />
    </UtilityBar>,
    { wrapper },
  );
}

describe('shared utility bar', () => {
  it('renders children → Life Compass → Gift Voucher → after → trailing', () => {
    renderBar();
    const bar = screen.getByTestId('utility-bar');
    expect(within(bar).getAllByTestId(SLOTS).map((n) => n.props.testID)).toEqual(['slot-child', 'utility-life-compass', 'utility-gift-voucher', 'slot-after', 'slot-trailing']);
  });

  it('hides Gift Voucher on iOS (IAP restricted) and keeps every other slot', () => {
    setOS('ios');
    renderBar();
    const bar = screen.getByTestId('utility-bar');
    expect(within(bar).getAllByTestId(SLOTS).map((n) => n.props.testID)).toEqual(['slot-child', 'utility-life-compass', 'slot-after', 'slot-trailing']);
  });

  it('Life Compass emits vitana:open-life-compass', () => {
    const opened = jest.fn();
    overlayBus.on(LIFE_COMPASS_OPEN, opened);
    renderBar();
    fireEvent.press(screen.getByTestId('utility-life-compass'));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(LIFE_COMPASS_OPEN).toBe('vitana:open-life-compass');
  });

  it('Gift Voucher emits gift-voucher:open with the current path as returnTo', () => {
    const opened = jest.fn();
    overlayBus.on(GIFT_VOUCHER_OPEN, opened);
    renderBar();
    fireEvent.press(screen.getByTestId('utility-gift-voucher'));
    expect(opened).toHaveBeenCalledWith({ returnTo: '/discover' });
    expect(GIFT_VOUCHER_OPEN).toBe('gift-voucher:open');
  });

  it('keeps the bus names of the web', () => {
    expect([INDEX_OPEN, AUTOPILOT_OPEN]).toEqual(['vitana:open-index', 'autopilot:open']);
  });

  it('every button has an accessibility label and a hit target of at least 44 pt', () => {
    renderBar();
    for (const id of ['utility-life-compass', 'utility-gift-voucher']) {
      const node = screen.getByTestId(id);
      expect(node.props.accessibilityLabel).toBeTruthy();
      const style = Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
      const slop = node.props.hitSlop ?? {};
      expect((style.height ?? 0) + (slop.top ?? 0) + (slop.bottom ?? 0)).toBeGreaterThanOrEqual(44);
    }
  });
});
