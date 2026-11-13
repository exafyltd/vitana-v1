/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — the gift
 * voucher after Stripe checkout (review finding discover-c68982e, same modal
 * copy): the request builders behind it (checkout response with its order
 * id, the member's own `voucher_orders` read and paid poll,
 * `voucher-download-pdf`, `voucher-send-email`) and the dialog's web states
 * (success, PDF preview, e-mail form, `voucher.toast.*`) once the browser
 * closes or the app is active again. Fake Supabase functions, no network, no
 * Stripe.
 */
import '../helpers/no-network';
import { browser, router, searchParams, share } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { VoucherModal } from '../../src/shell/utility/VoucherModal';
import { createVoucherCheckout, fetchVoucherOrder, waitForPaidVoucherOrder } from '../../src/shell/utility/data';
import { downloadVoucherPdf, sendVoucherEmail } from '../../src/screens/marketplace-orders/data/orders';
import { USER, commerceSupabase, commerceWrapper, voucherRow } from './helpers';

jest.setTimeout(30000);

const SIGNED = 'https://storage.g1-test.example.org/voucher-pdfs/o-1.pdf?token=t';
const VOUCHER = { code: 'GIFT-1234', tier: 'experience', tierName: 'Experience Voucher', price: '€99.00', purchaseDate: '2 November 2026', expiresAt: '2 November 2027', benefits: ['1 premium community event access'], buyerEmail: 'u1@example.org', orderId: 'o-1' };
/** Answers shaped like the deployed functions (vitana-v1 origin/main supabase/functions). */
const FUNCTIONS = {
  'stripe-create-voucher-checkout': { url: 'https://checkout.g1-test.example.org/s', session_id: 'cs_1', order_id: 'o-1' },
  'voucher-download-pdf': { success: true, voucher: VOUCHER, signedPdfUrl: SIGNED },
  'voucher-send-email': { success: true },
};

const titles = () => __toastsForTests().map((t) => t.titleKey);
type Log = Array<{ op: string; table?: string; args: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fns = (log: Log) => log.filter((o) => o.op === 'function');
const orderReads = (log: Log) => log.filter((o) => o.op === 'select' && o.table === 'voucher_orders');

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  browser.openBrowserAsync.mockImplementation(async () => ({ type: 'opened' }));
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('gift voucher — request builders', () => {
  it('createVoucherCheckout keeps the order id the function returns', async () => {
    const sb = commerceSupabase({ functions: FUNCTIONS });
    __setSupabaseForTests(sb.client as never);
    await expect(createVoucherCheckout('test', '/discover/marketplace')).resolves.toEqual(FUNCTIONS['stripe-create-voucher-checkout']);
    expect(fns(sb.log)).toEqual([{ op: 'function', table: 'stripe-create-voucher-checkout', args: { tier: 'test', returnTo: '/discover/marketplace' } }]);
  });

  it("fetchVoucherOrder reads the member's own voucher_orders row (by id, else the newest)", async () => {
    const sb = commerceSupabase({ tables: { voucher_orders: [voucherRow({ id: 'o-1' }), voucherRow({ id: 'o-2', buyer_user_id: 'u-2' })] } });
    __setSupabaseForTests(sb.client as never);
    await expect(fetchVoucherOrder('o-1')).resolves.toMatchObject({ id: 'o-1', status: 'paid' });
    await expect(fetchVoucherOrder('o-2')).resolves.toBeNull();
    await expect(fetchVoucherOrder(undefined)).resolves.toMatchObject({ id: 'o-1' });
    const reads = orderReads(sb.log);
    expect(reads[0].args).toEqual({ select: '*', filters: [['eq', 'buyer_user_id', USER], ['eq', 'id', 'o-1']], order: ['created_at', { ascending: false }], limit: 1 });
    expect(reads[2].args.filters).toEqual([['eq', 'buyer_user_id', USER]]);
  });

  it('waitForPaidVoucherOrder re-reads until the webhook marks the order paid, and gives up after the attempts', async () => {
    const rows = [voucherRow({ id: 'o-1', status: 'pending' })];
    const sb = commerceSupabase({ tables: { voucher_orders: rows } });
    __setSupabaseForTests(sb.client as never);
    const from = sb.client.from.getMockImplementation();
    let reads = 0;
    sb.client.from.mockImplementation((t: string) => {
      reads += 1;
      if (reads === 2) rows[0].status = 'paid';
      return from(t);
    });
    await expect(waitForPaidVoucherOrder('o-1', 4, 0)).resolves.toMatchObject({ status: 'paid' });
    expect(reads).toBe(2);
    rows[0].status = 'pending';
    reads = 10;
    await expect(waitForPaidVoucherOrder('o-1', 3, 0)).resolves.toBeNull();
    expect(reads).toBe(13);
  });

  it('downloadVoucherPdf and sendVoucherEmail call the web functions with the web bodies', async () => {
    const sb = commerceSupabase({ functions: FUNCTIONS });
    __setSupabaseForTests(sb.client as never);
    await expect(downloadVoucherPdf('o-1')).resolves.toMatchObject({ signedPdfUrl: SIGNED, voucher: { code: 'GIFT-1234', expiresAt: '2 November 2027' } });
    await sendVoucherEmail({ orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' });
    expect(fns(sb.log).map((o) => [o.table, o.args])).toEqual([
      ['voucher-download-pdf', { orderId: 'o-1' }],
      ['voucher-send-email', { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' }],
    ]);
  });
});

describe('gift voucher — the dialog after checkout', () => {
  const renderModal = (status: string, type: 'cancel' | 'opened' = 'cancel') => {
    const onOpenChange = jest.fn();
    const rows = [voucherRow({ id: 'o-1', status })];
    const w = commerceWrapper({}, { tables: { voucher_orders: rows }, functions: FUNCTIONS });
    browser.openBrowserAsync.mockImplementation(async () => ({ type }));
    const view = render(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover/marketplace" />, { wrapper: w.wrapper });
    return { ...w, rows, onOpenChange, view };
  };
  const buy = async () => {
    fireEvent.press(await screen.findByTestId('voucher-tier-experience'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-buy'));
    });
  };

  it('paid: the success state, the PDF preview from voucher-download-pdf, its download and share', async () => {
    const { log } = renderModal('paid');
    await buy();
    expect(browser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.g1-test.example.org/s');
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(screen.getByText('Your Experience voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(fns(log).at(-1)).toEqual({ op: 'function', table: 'voucher-download-pdf', args: { orderId: 'o-1' } });
    expect(titles()).toContain('voucher.toast.generatingVoucher');
    expect(await screen.findByTestId('voucher-pdf-preview')).toBeTruthy();
    expect(screen.getByText('GIFT-1234')).toBeTruthy();
    expect(screen.getByText('Valid until 2 November 2027')).toBeTruthy();
    expect(screen.getByText('EXPERIENCE VOUCHER')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-pdf-download'));
    });
    expect(browser.openBrowserAsync).toHaveBeenLastCalledWith(SIGNED);
    expect(titles()).toContain('voucher.toast.downloadStarted');
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-pdf-share'));
    });
    expect(share).toHaveBeenCalledWith({ title: 'Gift Voucher', message: `Gift Voucher\n${SIGNED}`, url: SIGNED });
    expect(titles()).toContain('voucher.toast.voucherShared');
    fireEvent.press(screen.getByTestId('voucher-pdf-close'));
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
  });

  it('paid: the e-mail form sends voucher-send-email, toasts voucherSent and closes', async () => {
    const { log, onOpenChange } = renderModal('paid');
    await buy();
    fireEvent.press(await screen.findByTestId('voucher-send-email'));
    expect(screen.getByText('Send Voucher by Email')).toBeTruthy();
    expect(screen.getByTestId('voucher-email-send').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(screen.getByTestId('voucher-email-recipient'), 'friend@example.org');
    fireEvent.changeText(screen.getByTestId('voucher-email-name'), 'Jane');
    fireEvent.changeText(screen.getByTestId('voucher-email-message'), 'Happy Birthday');
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-email-send'));
    });
    expect(fns(log).at(-1)).toEqual({ op: 'function', table: 'voucher-send-email', args: { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Happy Birthday' } });
    expect(__toastsForTests().find((t) => t.titleKey === 'voucher.toast.voucherSent')?.params).toEqual({ email: 'friend@example.org' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('paid: a failed PDF read toasts the error and keeps the success state', async () => {
    const { client } = renderModal('paid');
    await buy();
    client.functions.invoke.mockImplementationOnce(async () => ({ data: { success: false }, error: null }));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('voucher-download'));
    });
    expect(titles()).toContain('voucher.toast.failedToLoadVoucher');
    expect(screen.getByText('Voucher Purchased!')).toBeTruthy();
  });

  it('not paid (cancelled or still pending): back to the selection, no voucher calls', async () => {
    const { log } = renderModal('pending');
    await buy();
    await waitFor(() => expect(screen.getByTestId('voucher-buy')).toBeTruthy(), { timeout: 8000 });
    expect(screen.queryByText('Voucher Purchased!')).toBeNull();
    expect(fns(log).map((o) => o.table)).toEqual(['stripe-create-voucher-checkout']);
    expect(orderReads(log).length).toBe(4);
  });

  it('checkout failure: toasts checkoutFailed and returns to the selection', async () => {
    const { client } = renderModal('paid');
    client.functions.invoke.mockImplementationOnce(async () => ({ data: null, error: { message: 'x' } }));
    await buy();
    expect(titles()).toContain('voucher.toast.checkoutFailed');
    expect(screen.getByTestId('voucher-buy')).toBeTruthy();
    expect(browser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('Android: the browser opens (resolves at once), the app comes back active → the order is re-read → the success state', async () => {
    const handlers: Array<(s: AppStateStatus) => void> = [];
    // jest-expo's AppState.addEventListener is itself a mock: swap it, never spyOn/mockRestore (that would wipe its implementation).
    const original = AppState.addEventListener;
    AppState.addEventListener = ((_e: string, h: (s: AppStateStatus) => void) => {
      handlers.push(h);
      return { remove: () => undefined };
    }) as never;
    const { log, rows } = renderModal('pending', 'opened');
    await buy();
    expect(screen.getByTestId('voucher-loading')).toBeTruthy();
    expect(orderReads(log)).toEqual([]);
    rows[0].status = 'paid';
    await act(async () => {
      handlers.forEach((h) => h('background'));
      handlers.forEach((h) => h('active'));
    });
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(orderReads(log)[0].args.filters).toEqual([['eq', 'buyer_user_id', USER], ['eq', 'id', 'o-1']]);
    AppState.addEventListener = original;
  });

  it("the web's return params, if the link reaches the app: voucher_success opens the success state and clears them; voucher_cancelled is cleared", async () => {
    searchParams.current = { voucher_success: 'true', order_id: 'o-9', tier: 'exclusive' };
    const onOpenChange = jest.fn();
    const w = commerceWrapper({}, { functions: FUNCTIONS });
    const view = render(<VoucherModal open={false} onOpenChange={onOpenChange} returnTo="/discover/marketplace" />, { wrapper: w.wrapper });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(router.setParams).toHaveBeenCalledWith({ voucher_success: undefined, order_id: undefined, tier: undefined });
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover/marketplace" />);
    expect(await screen.findByText('Your Exclusive voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(fns(w.log).at(-1)).toEqual({ op: 'function', table: 'voucher-download-pdf', args: { orderId: 'o-9' } });
    searchParams.current = { voucher_cancelled: 'true' };
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover/marketplace" />);
    expect(router.setParams).toHaveBeenLastCalledWith({ voucher_cancelled: undefined });
  });
});
