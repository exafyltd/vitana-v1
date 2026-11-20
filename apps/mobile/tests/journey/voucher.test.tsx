/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey; VTID-05653: against the one shared modal) — the gift voucher
 * after Stripe checkout (review finding discover-c68982e, same modal copy):
 * the request builders behind it (checkout response with its order id, the
 * member's own `voucher_orders` read and paid poll, `voucher-download-pdf`,
 * `voucher-send-email`) and the dialog's web states (success, PDF preview,
 * e-mail form, `voucher.toast.*`) once the browser closes or the app is
 * active again. Fake Supabase functions, no network, no Stripe.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import * as WebBrowser from 'expo-web-browser';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Share, type AppStateStatus } from 'react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { VoucherModal } from '../../src/shell/utility/VoucherModal';
import { createVoucherCheckout, downloadVoucherPdf, fetchVoucherOrder, sendVoucherEmail, waitForPaidVoucherOrder } from '../../src/shell/utility/data';
import { journeySupabase, journeyWrapper, type DbCall } from './helpers';

// tests/helpers/mocks.ts stubs expo-web-browser with openAuthSessionAsync only; the voucher checkout uses openBrowserAsync.
const openBrowser = jest.fn(async (_url: string): Promise<{ type: string }> => ({ type: 'opened' }));
(WebBrowser as unknown as { openBrowserAsync: jest.Mock }).openBrowserAsync = openBrowser;

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30000);

const SIGNED = 'https://storage.g1-test.example.org/voucher-pdfs/o-1.pdf?token=t';
const VOUCHER = { code: 'GIFT-1234', tier: 'experience', tierName: 'Experience Voucher', price: '€99.00', purchaseDate: '2 November 2026', expiresAt: '2 November 2027', benefits: ['1 premium community event access'], buyerEmail: 'u1@example.org', orderId: 'o-1' };
/** Answers shaped like the deployed functions (vitana-v1 origin/main supabase/functions). */
const FUNCTIONS = {
  'stripe-create-voucher-checkout': () => ({ data: { url: 'https://checkout.g1-test.example.org/s', session_id: 'cs_1', order_id: 'o-1' } }),
  'voucher-download-pdf': () => ({ data: { success: true, voucher: VOUCHER, signedPdfUrl: SIGNED } }),
  'voucher-send-email': () => ({ data: { success: true } }),
};

/** `voucher_orders` with the eq filters applied (the shared double records them, this answers by them). */
const ownRows = (rows: Array<Record<string, unknown>>) => (call: DbCall) => rows.filter((r) => call.filters.every(([op, c, v]) => op !== 'eq' || r[c] === v));
const orderReads = (calls: DbCall[]) => calls.filter((c) => c.table === 'voucher_orders');
const titles = () => __toastsForTests().map((t) => t.titleKey);

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  openBrowser.mockImplementation(async () => ({ type: 'opened' }));
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('gift voucher — request builders', () => {
  it('createVoucherCheckout keeps the order id the function returns', async () => {
    const db = journeySupabase({ functions: FUNCTIONS });
    __setSupabaseForTests(db.client as never);
    await expect(createVoucherCheckout('test', '/autopilot')).resolves.toEqual({ url: 'https://checkout.g1-test.example.org/s', session_id: 'cs_1', order_id: 'o-1' });
    expect(db.functionCalls).toEqual([{ name: 'stripe-create-voucher-checkout', body: { tier: 'test', returnTo: '/autopilot' } }]);
  });

  it("fetchVoucherOrder reads the member's own voucher_orders row (by id, else the newest)", async () => {
    const rows = [{ id: 'o-1', buyer_user_id: 'u-1', status: 'paid' }, { id: 'o-2', buyer_user_id: 'u-2', status: 'paid' }];
    const db = journeySupabase({ tables: { voucher_orders: ownRows(rows) } });
    __setSupabaseForTests(db.client as never);
    await expect(fetchVoucherOrder('o-1')).resolves.toMatchObject({ id: 'o-1', status: 'paid' });
    await expect(fetchVoucherOrder('o-2')).resolves.toBeNull();
    await expect(fetchVoucherOrder(undefined)).resolves.toMatchObject({ id: 'o-1' });
    const reads = orderReads(db.calls);
    expect(reads[0].filters).toEqual([['eq', 'buyer_user_id', 'u-1'], ['eq', 'id', 'o-1'], ['order', 'created_at', { ascending: false }], ['limit', 1, undefined]]);
    expect(reads[2].filters.filter(([op]) => op === 'eq')).toEqual([['eq', 'buyer_user_id', 'u-1']]);
  });

  it('waitForPaidVoucherOrder re-reads until the webhook marks the order paid, and gives up after the attempts', async () => {
    const rows = [{ id: 'o-1', buyer_user_id: 'u-1', status: 'pending' }];
    let reads = 0;
    const db = journeySupabase({
      tables: {
        voucher_orders: (call) => {
          reads += 1;
          if (reads === 2) rows[0].status = 'paid';
          return ownRows(rows)(call);
        },
      },
    });
    __setSupabaseForTests(db.client as never);
    await expect(waitForPaidVoucherOrder('o-1', 4, 0)).resolves.toMatchObject({ status: 'paid' });
    expect(reads).toBe(2);
    rows[0].status = 'pending';
    reads = 10;
    await expect(waitForPaidVoucherOrder('o-1', 3, 0)).resolves.toBeNull();
    expect(reads).toBe(13);
  });

  it('downloadVoucherPdf and sendVoucherEmail call the web functions with the web bodies', async () => {
    const db = journeySupabase({ functions: FUNCTIONS });
    __setSupabaseForTests(db.client as never);
    await expect(downloadVoucherPdf('o-1')).resolves.toMatchObject({ signedPdfUrl: SIGNED, voucher: { code: 'GIFT-1234' } });
    await sendVoucherEmail({ orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' });
    expect(db.functionCalls).toEqual([
      { name: 'voucher-download-pdf', body: { orderId: 'o-1' } },
      { name: 'voucher-send-email', body: { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' } },
    ]);
  });
});

describe('gift voucher — the dialog after checkout', () => {
  const renderModal = (status: string, type: 'cancel' | 'opened' = 'cancel', functions: typeof FUNCTIONS | Record<string, () => { data?: unknown; error?: unknown }> = FUNCTIONS) => {
    const onOpenChange = jest.fn();
    const rows = [{ id: 'o-1', buyer_user_id: 'u-1', status }];
    const w = journeyWrapper({}, { tables: { voucher_orders: ownRows(rows) }, functions });
    openBrowser.mockImplementation(async () => ({ type }));
    render(<VoucherModal open onOpenChange={onOpenChange} returnTo="/autopilot" />, { wrapper: w.wrapper });
    return { ...w, rows, onOpenChange };
  };
  const buy = async () => {
    fireEvent.press(await screen.findByTestId('voucher-tier-experience'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-buy'));
    });
  };

  it('paid: the success state, the PDF preview from voucher-download-pdf, its download and share', async () => {
    const { db } = renderModal('paid');
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
    await buy();
    expect(openBrowser).toHaveBeenCalledWith('https://checkout.g1-test.example.org/s');
    expect(db.functionCalls[0]).toEqual({ name: 'stripe-create-voucher-checkout', body: { tier: 'experience', returnTo: '/autopilot' } });
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(screen.getByText('Your Experience voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(db.functionCalls.at(-1)).toEqual({ name: 'voucher-download-pdf', body: { orderId: 'o-1' } });
    expect(titles()).toContain('voucher.toast.generatingVoucher');
    expect(await screen.findByTestId('voucher-pdf-preview')).toBeTruthy();
    expect(screen.getByText('GIFT-1234')).toBeTruthy();
    expect(screen.getByText('Valid until 2 November 2027')).toBeTruthy();
    expect(screen.getByText('EXPERIENCE VOUCHER')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-pdf-download'));
    });
    expect(openBrowser).toHaveBeenLastCalledWith(SIGNED);
    expect(titles()).toContain('voucher.toast.downloadStarted');
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-pdf-share'));
    });
    expect(share).toHaveBeenCalledWith({ title: 'Gift Voucher', message: `Gift Voucher\n${SIGNED}`, url: SIGNED });
    expect(titles()).toContain('voucher.toast.voucherShared');
    fireEvent.press(screen.getByTestId('voucher-pdf-close'));
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    share.mockRestore();
  });

  it('paid: the e-mail form sends voucher-send-email, toasts voucherSent and closes', async () => {
    const { db, onOpenChange } = renderModal('paid');
    await buy();
    fireEvent.press(await screen.findByTestId('voucher-send-email'));
    expect(screen.getByText('Send Voucher by Email')).toBeTruthy();
    expect(screen.getByTestId('voucher-email-send').props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('voucher-email-recipient'), 'friend@example.org');
    fireEvent.changeText(screen.getByTestId('voucher-email-name'), 'Jane');
    fireEvent.changeText(screen.getByTestId('voucher-email-message'), 'Happy Birthday');
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-email-send'));
    });
    expect(db.functionCalls.at(-1)).toEqual({ name: 'voucher-send-email', body: { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Happy Birthday' } });
    expect(__toastsForTests().find((t) => t.titleKey === 'voucher.toast.voucherSent')?.params).toEqual({ email: 'friend@example.org' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('paid: a failed PDF read toasts the error and keeps the success state', async () => {
    renderModal('paid', 'cancel', { ...FUNCTIONS, 'voucher-download-pdf': () => ({ data: { success: false } }) });
    await buy();
    await act(async () => {
      fireEvent.press(await screen.findByTestId('voucher-download'));
    });
    expect(titles()).toContain('voucher.toast.failedToLoadVoucher');
    expect(screen.getByText('Voucher Purchased!')).toBeTruthy();
  });

  it('not paid (cancelled or still pending): back to the selection, no voucher calls', async () => {
    const { db } = renderModal('pending');
    await buy();
    await waitFor(() => expect(screen.getByTestId('voucher-buy')).toBeTruthy(), { timeout: 8000 });
    expect(screen.queryByText('Voucher Purchased!')).toBeNull();
    expect(db.functions).toEqual(['stripe-create-voucher-checkout']);
    expect(orderReads(db.calls).length).toBe(4);
  });

  it('checkout failure: toasts checkoutFailed and returns to the selection', async () => {
    renderModal('paid', 'cancel', { ...FUNCTIONS, 'stripe-create-voucher-checkout': () => ({ error: { message: 'x' } }) });
    await buy();
    expect(titles()).toContain('voucher.toast.checkoutFailed');
    expect(screen.getByTestId('voucher-buy')).toBeTruthy();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it('Android: the browser opens (resolves at once), the app comes back active → the order is re-read → the success state', async () => {
    const handlers: Array<(s: AppStateStatus) => void> = [];
    // jest-expo's AppState.addEventListener is itself a mock: swap it, never spyOn/mockRestore (that would wipe its implementation).
    const original = AppState.addEventListener;
    AppState.addEventListener = ((_e: string, h: (s: AppStateStatus) => void) => {
      handlers.push(h);
      return { remove: () => undefined };
    }) as never;
    const { db, rows } = renderModal('pending', 'opened');
    await buy();
    expect(screen.getByTestId('voucher-loading')).toBeTruthy();
    expect(orderReads(db.calls)).toEqual([]);
    rows[0].status = 'paid';
    await act(async () => {
      handlers.forEach((h) => h('background'));
      handlers.forEach((h) => h('active'));
    });
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(orderReads(db.calls)[0].filters.slice(0, 2)).toEqual([['eq', 'buyer_user_id', 'u-1'], ['eq', 'id', 'o-1']]);
    AppState.addEventListener = original;
  });

  it("the web's return params, if the link reaches the app: voucher_success opens the success state and clears them; voucher_cancelled is cleared", async () => {
    searchParams.current = { voucher_success: 'true', order_id: 'o-9', tier: 'exclusive' };
    const onOpenChange = jest.fn();
    const w = journeyWrapper({}, { functions: FUNCTIONS });
    const view = render(<VoucherModal open={false} onOpenChange={onOpenChange} returnTo="/autopilot" />, { wrapper: w.wrapper });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(router.setParams).toHaveBeenCalledWith({ voucher_success: undefined, order_id: undefined, tier: undefined });
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/autopilot" />);
    expect(await screen.findByText('Your Exclusive voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(w.db.functionCalls.at(-1)).toEqual({ name: 'voucher-download-pdf', body: { orderId: 'o-9' } });
    searchParams.current = { voucher_cancelled: 'true' };
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/autopilot" />);
    expect(router.setParams).toHaveBeenLastCalledWith({ voucher_cancelled: undefined });
  });
});
