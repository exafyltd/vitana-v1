/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — `/redeem` states and
 * gateway (Supabase) calls, 1:1 with `src/pages/RedeemVoucher.tsx` +
 * `src/hooks/useRedeemVoucher.ts` (tasks.md wallet-redeem tasks 1 + 3):
 * code valid (landing signed out, confirm signed in, claim), invalid (no code,
 * not found), already claimed, expired, error (lookup error, claim error);
 * renders without an authenticated session (plan decision 2a). The built
 * requests are asserted; the Supabase client is a fake, no network.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RedeemScreen } from '../../src/screens/wallet-redeem/RedeemScreen';
import { FAIL, USER, VOUCHER_ID, order, redeemWrapper, voucher } from './helpers';

beforeEach(() => {
  searchParams.current = {};
  router.push.mockClear();
});


describe('lookup (useVoucherByCode twin)', () => {
  it('looks the code up upper-cased in vouchers.code, then the order by voucher_id', async () => {
    searchParams.current = { voucher: 'gift-2026' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher()], orders: [order()] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(built).toEqual([
      { table: 'vouchers', op: 'select', columns: '*', filters: [['code', 'GIFT-2026']], terminal: 'maybeSingle' },
      { table: 'voucher_orders', op: 'select', columns: 'id, buyer_name, buyer_email, amount_cents, currency, created_at', filters: [['voucher_id', VOUCHER_ID]], terminal: 'maybeSingle' },
    ]);
  });

  it('legacy fallback: no code match → lists vouchers and matches the first 8 id characters', async () => {
    searchParams.current = { voucher: 'abcd1234' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher({ code: null })], orders: [] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(built.map((b) => [b.table, b.terminal, b.filters])).toEqual([
      ['vouchers', 'maybeSingle', [['code', 'ABCD1234']]],
      ['vouchers', 'list', []],
      ['voucher_orders', 'maybeSingle', [['voucher_id', VOUCHER_ID]]],
    ]);
    // web: code || id.slice(0, 8).toUpperCase(); no order → "Experience Voucher" badge, €0.00
    expect(screen.getByTestId('redeem-code')).toHaveTextContent('ABCD1234');
    expect(screen.getByTestId('redeem-tier-badge')).toHaveTextContent('Experience Voucher');
    expect(screen.getByTestId('redeem-value')).toHaveTextContent('€0.00');
  });

  it('a failing code-column query still tries the fallback (web try/catch)', async () => {
    searchParams.current = { voucher: 'ABCD1234' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher()], orders: [order()], codeLookup: FAIL });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(built.map((b) => b.terminal)).toEqual(['maybeSingle', 'list', 'maybeSingle']);
  });
});

describe('invalid', () => {
  it('no ?voucher= → Invalid link, no request, Go to MAXINA', async () => {
    const { wrapper, built } = redeemWrapper({});
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-invalid-link')).toBeTruthy());
    expect(screen.getByText('Invalid Link')).toBeTruthy();
    expect(built).toEqual([]);
    fireEvent.press(screen.getByTestId('redeem-go-maxina'));
    expect(router.push).toHaveBeenCalledWith('/maxina');
  });

  it('unknown code → Voucher not found', async () => {
    searchParams.current = { voucher: 'NOPE' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-not-found')).toBeTruthy());
    expect(screen.getByText('Voucher Not Found')).toBeTruthy();
    fireEvent.press(screen.getByTestId('redeem-go-maxina'));
    expect(router.push).toHaveBeenCalledWith('/maxina');
  });

  it('error: lookup fails both ways → Voucher not found', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()], codeLookup: FAIL, list: FAIL });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-not-found')).toBeTruthy());
  });

  it('while loading: the form skeleton and "Loading your gift voucher..."', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()] });
    render(<RedeemScreen />, { wrapper });
    expect(screen.getByTestId('redeem-loading')).toBeTruthy();
    expect(screen.getByText('Loading your gift voucher...')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
  });
});

describe('already claimed / expired', () => {
  it('status redeemed → Already redeemed, no claim offered', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher({ status: 'redeemed', redeemed_by_user_id: 'u-other' })], orders: [order()] }, { signedIn: true });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-already-redeemed')).toBeTruthy());
    expect(screen.getByText('Already Redeemed')).toBeTruthy();
    expect(screen.queryByTestId('redeem-claim')).toBeNull();
  });

  it('expires_at in the past → Voucher expired', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher({ expires_at: '2020-01-01T00:00:00.000Z' })], orders: [order()] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-expired')).toBeTruthy());
    expect(screen.getByText('Voucher Expired')).toBeTruthy();
  });
});

describe('valid code, signed out (renders without an authenticated session)', () => {
  it('shows the landing: gift, from, tier, value, code, benefits; sign in / register keep the redeem link', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher({ tier: 'exclusive' })], orders: [order()] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(screen.getByText("You've received a gift!")).toBeTruthy();
    expect(screen.getByText('From Jane')).toBeTruthy();
    expect(screen.getByTestId('redeem-tier-badge')).toHaveTextContent('Exclusive Voucher');
    expect(screen.getByTestId('redeem-value')).toHaveTextContent('€49.00');
    expect(screen.getByTestId('redeem-code')).toHaveTextContent('GIFT-2026');
    expect(screen.getByText('1-on-1 expert coaching session')).toBeTruthy();
    expect(screen.getByText('Priority booking + VIP perks')).toBeTruthy();
    expect(screen.getByText('Powered by MAXINA')).toBeTruthy();
    expect(screen.queryByTestId('redeem-claim')).toBeNull();

    fireEvent.press(screen.getByTestId('redeem-sign-in'));
    expect(router.push).toHaveBeenLastCalledWith('/maxina?redirectTo=%2Fredeem%3Fvoucher%3DGIFT-2026');
    fireEvent.press(screen.getByTestId('redeem-register'));
    expect(router.push).toHaveBeenLastCalledWith('/maxina?redirectTo=%2Fredeem%3Fvoucher%3DGIFT-2026&mode=register');
    expect(built.some((b) => b.op === 'update')).toBe(false);
  });

  it('an unknown tier shows its raw name and the experience benefits (web TIER_NAMES / TIER_CONFIG fallback)', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher({ tier: 'gold' })], orders: [order()] });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(screen.getByTestId('redeem-tier-badge')).toHaveTextContent('gold');
    expect(screen.getByText('Personalized wellness consultation')).toBeTruthy();
  });
});

describe('valid code, signed in: claim (useClaimVoucher twin)', () => {
  it('claims with the web update + filters, then shows Voucher claimed! with the tier name', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher()], orders: [order()] }, { signedIn: true });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    expect(screen.getByText('Claim Your Gift')).toBeTruthy();
    expect(screen.getByTestId('redeem-gift-from')).toHaveTextContent('Gift from Jane');
    expect(screen.getByText('Experience Voucher')).toBeTruthy();

    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claimed')).toBeTruthy());

    const update = built.find((b) => b.op === 'update');
    expect(update).toEqual({
      table: 'vouchers',
      op: 'update',
      values: { status: 'redeemed', redeemed_by_user_id: USER, redeemed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) },
      filters: [
        ['id', VOUCHER_ID],
        ['status', 'active'],
      ],
      terminal: 'single',
    });
    expect(screen.getByText('Voucher Claimed!')).toBeTruthy();
    expect(screen.getByText(/Experience Voucher/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('redeem-view-wallet'));
    expect(router.push).toHaveBeenLastCalledWith('/wallet');
    fireEvent.press(screen.getByTestId('redeem-browse-events'));
    expect(router.push).toHaveBeenLastCalledWith('/comm/events-meetups');
  });

  it('the claim invalidates voucher-by-code (refetch) and stays on the claimed state', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper, built } = redeemWrapper({ vouchers: [voucher()], orders: [] }, { signedIn: true });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    const before = built.filter((b) => b.op === 'select').length;
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(built.filter((b) => b.op === 'select').length).toBeGreaterThan(before));
    expect(screen.getByTestId('redeem-claimed')).toBeTruthy();
    // no order → web "wellness" fallback in the message
    expect(screen.getByText(/Your wellness/)).toBeTruthy();
  });

  it('while claiming: the button is disabled and says Claiming...', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()], orders: [order()], claim: 'pending' }, { signedIn: true });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claiming')).toBeTruthy());
    expect(screen.getByTestId('redeem-claim')).toBeDisabled();
    expect(screen.getByText('Claiming...')).toBeTruthy();
  });

  it('error: a failed claim shows the web message and stays on the confirm screen', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()], orders: [order()], claim: FAIL }, { signedIn: true });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claim-error')).toBeTruthy());
    expect(screen.getByText('Failed to claim voucher. It may have already been redeemed.')).toBeTruthy();
    expect(screen.queryByTestId('redeem-claimed')).toBeNull();
  });
});
