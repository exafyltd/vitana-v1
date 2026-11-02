/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the gift voucher
 * after Stripe checkout (review finding discover-c68982e): the request
 * builders behind it (checkout response with its order id, the member's own
 * `voucher_orders` read, `voucher-download-pdf`, `voucher-send-email`, the
 * browser-return wait) and the dialog's web states (success, PDF preview,
 * e-mail form, `voucher.toast.*`) once the browser closes. Supabase double
 * with fake functions, no network, no Stripe.
 */
import '../helpers/no-network';
import { openBrowser, router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Share, type AppStateStatus } from 'react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { VoucherModal } from '../../src/screens/discover/VoucherModal';
import {
  createVoucherCheckout,
  downloadVoucherPdf,
  fetchVoucherOrder,
  sendVoucherEmail,
  waitForPaidVoucherOrder,
} from '../../src/screens/discover/data/utility';
import { discoverClient, discoverWrapper } from './helpers';

jest.setTimeout(30000);

const SIGNED = 'https://storage.g1-test.example.org/voucher-pdfs/o-1.pdf?token=t';
const VOUCHER = { code: 'GIFT-1234', tier: 'experience', tierName: 'Experience Voucher', price: '€99.00', purchaseDate: '2 November 2026', expiresAt: '2 November 2027', benefits: ['1 premium community event access'], buyerEmail: 'u1@example.org', orderId: 'o-1' };

/** Answers each edge function like the deployed one (shapes from vitana-v1 origin/main supabase/functions). */
function fakeFunctions(db: ReturnType<typeof discoverClient>, over: Record<string, () => unknown> = {}) {
  db.client.functions.invoke.mockImplementation(async (name: string, o: { body: unknown }) => {
    db.invokes.push({ name, body: o.body });
    if (over[name]) return over[name]();
    if (name === 'stripe-create-voucher-checkout') return { data: { url: 'https://checkout.g1-test.example.org/s', session_id: 'cs_1', order_id: 'o-1' }, error: null };
    if (name === 'voucher-download-pdf') return { data: { success: true, voucher: VOUCHER, signedPdfUrl: SIGNED }, error: null };
    if (name === 'voucher-send-email') return { data: { success: true }, error: null };
    return { data: null, error: { message: 'unknown function' } };
  });
}

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
    const db = discoverClient();
    __setSupabaseForTests(db.client as never);
    fakeFunctions(db);
    await expect(createVoucherCheckout('test', '/discover')).resolves.toEqual({ url: 'https://checkout.g1-test.example.org/s', session_id: 'cs_1', order_id: 'o-1' });
    expect(db.invokes).toEqual([{ name: 'stripe-create-voucher-checkout', body: { tier: 'test', returnTo: '/discover' } }]);
  });

  it("fetchVoucherOrder reads the member's own voucher_orders row (by id, else the newest)", async () => {
    const db = discoverClient({ tables: { voucher_orders: [{ id: 'o-1', buyer_user_id: 'u-1', status: 'paid' }, { id: 'o-2', buyer_user_id: 'u-2', status: 'paid' }] } });
    __setSupabaseForTests(db.client as never);
    await expect(fetchVoucherOrder('o-1')).resolves.toMatchObject({ id: 'o-1', status: 'paid' });
    await expect(fetchVoucherOrder('o-2')).resolves.toBeNull();
    await expect(fetchVoucherOrder(undefined)).resolves.toMatchObject({ id: 'o-1' });
    expect(db.ops[0]).toEqual({ table: 'voucher_orders', op: 'select', filters: [['eq', 'buyer_user_id', 'u-1'], ['eq', 'id', 'o-1']], order: ['created_at', { ascending: false }] });
    expect(db.ops[2].filters).toEqual([['eq', 'buyer_user_id', 'u-1']]);
  });

  it('fetchVoucherOrder reads nothing when signed out', async () => {
    const db = discoverClient({ signedIn: false });
    __setSupabaseForTests(db.client as never);
    await expect(fetchVoucherOrder('o-1')).resolves.toBeNull();
    expect(db.ops).toEqual([]);
  });

  it('waitForPaidVoucherOrder re-reads until the webhook marks the order paid, and gives up after the attempts', async () => {
    const tables = { voucher_orders: [{ id: 'o-1', buyer_user_id: 'u-1', status: 'pending' }] };
    const db = discoverClient({ tables });
    __setSupabaseForTests(db.client as never);
    const from = db.client.from.getMockImplementation();
    let reads = 0;
    db.client.from.mockImplementation((t: string) => {
      reads += 1;
      if (reads === 2) tables.voucher_orders[0].status = 'paid';
      return from(t);
    });
    await expect(waitForPaidVoucherOrder('o-1', 4, 0)).resolves.toMatchObject({ status: 'paid' });
    expect(reads).toBe(2);
    tables.voucher_orders[0].status = 'pending';
    reads = 10;
    await expect(waitForPaidVoucherOrder('o-1', 3, 0)).resolves.toBeNull();
    expect(reads).toBe(13);
  });

  it('downloadVoucherPdf and sendVoucherEmail call the web functions with the web bodies', async () => {
    const db = discoverClient();
    __setSupabaseForTests(db.client as never);
    fakeFunctions(db);
    await expect(downloadVoucherPdf('o-1')).resolves.toMatchObject({ signedPdfUrl: SIGNED, voucher: { code: 'GIFT-1234' } });
    await sendVoucherEmail({ orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' });
    expect(db.invokes).toEqual([
      { name: 'voucher-download-pdf', body: { orderId: 'o-1' } },
      { name: 'voucher-send-email', body: { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Hi' } },
    ]);
  });
});

describe('gift voucher — the dialog after checkout', () => {
  const renderModal = (status: string, browser: 'cancel' | 'opened' = 'cancel') => {
    const onOpenChange = jest.fn();
    const w = discoverWrapper({}, { tables: { voucher_orders: [{ id: 'o-1', buyer_user_id: 'u-1', status }] } });
    fakeFunctions(w.db);
    openBrowser.mockImplementation(async () => ({ type: browser }));
    render(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover" />, { wrapper: w.wrapper });
    return { ...w, onOpenChange };
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
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(screen.getByText('Your Experience voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(db.invokes.at(-1)).toEqual({ name: 'voucher-download-pdf', body: { orderId: 'o-1' } });
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
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-email-send'));
    });
    expect(db.invokes.map((i) => i.name)).not.toContain('voucher-send-email');
    fireEvent.changeText(screen.getByTestId('voucher-email-recipient'), 'friend@example.org');
    fireEvent.changeText(screen.getByTestId('voucher-email-name'), 'Jane');
    fireEvent.changeText(screen.getByTestId('voucher-email-message'), 'Happy Birthday');
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-email-send'));
    });
    expect(db.invokes.at(-1)).toEqual({ name: 'voucher-send-email', body: { orderId: 'o-1', recipientEmail: 'friend@example.org', recipientName: 'Jane', message: 'Happy Birthday' } });
    expect(__toastsForTests().find((t) => t.titleKey === 'voucher.toast.voucherSent')?.params).toEqual({ email: 'friend@example.org' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('paid: a failed PDF read toasts the error and keeps the success state', async () => {
    const { db } = renderModal('paid');
    await buy();
    db.client.functions.invoke.mockImplementationOnce(async () => ({ data: { success: false }, error: null }));
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
    expect(db.invokes.map((i) => i.name)).toEqual(['stripe-create-voucher-checkout']);
    expect(db.ops.filter((o) => o.table === 'voucher_orders').length).toBe(4);
  });

  it('checkout failure: toasts checkoutFailed and returns to the selection', async () => {
    const { db } = renderModal('paid');
    db.client.functions.invoke.mockImplementationOnce(async () => ({ data: null, error: { message: 'x' } }));
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
    const { db } = renderModal('pending', 'opened');
    await buy();
    expect(screen.getByTestId('voucher-loading')).toBeTruthy();
    expect(db.ops.filter((o) => o.table === 'voucher_orders')).toEqual([]);
    db.tables.voucher_orders[0].status = 'paid';
    await act(async () => {
      handlers.forEach((h) => h('background'));
      handlers.forEach((h) => h('active'));
    });
    expect(await screen.findByText('Voucher Purchased!')).toBeTruthy();
    expect(db.ops.filter((o) => o.table === 'voucher_orders')[0].filters).toEqual([['eq', 'buyer_user_id', 'u-1'], ['eq', 'id', 'o-1']]);
    AppState.addEventListener = original;
  });

  it("the web's return params, if the link reaches the app: voucher_success opens the success state and clears them; voucher_cancelled is cleared", async () => {
    searchParams.current = { voucher_success: 'true', order_id: 'o-9', tier: 'exclusive' };
    const onOpenChange = jest.fn();
    const w = discoverWrapper({});
    fakeFunctions(w.db);
    const view = render(<VoucherModal open={false} onOpenChange={onOpenChange} returnTo="/discover" />, { wrapper: w.wrapper });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(router.setParams).toHaveBeenCalledWith({ voucher_success: undefined, order_id: undefined, tier: undefined });
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover" />);
    expect(await screen.findByText('Your Exclusive voucher is ready')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-download'));
    });
    expect(w.db.invokes.at(-1)).toEqual({ name: 'voucher-download-pdf', body: { orderId: 'o-9' } });
    searchParams.current = { voucher_cancelled: 'true' };
    view.rerender(<VoucherModal open onOpenChange={onOpenChange} returnTo="/discover" />);
    expect(router.setParams).toHaveBeenLastCalledWith({ voucher_cancelled: undefined });
  });
});
