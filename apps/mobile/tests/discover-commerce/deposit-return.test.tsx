/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * Stripe deposit return leg of the cart's AddMoneyDialog (web: Stripe returns
 * to /wallet?depositId=&depositResult=, Wallet.tsx polls the deposit, toasts
 * the outcome and refreshes the balance). Natively the hosted checkout opens
 * in the system browser; when it closes, on AppState 'active' and on screen
 * focus while a deposit is pending, the balance, cart, budget and deposit are
 * refetched and `GET /wallet/deposits/:id` is polled (bounded) until a
 * terminal status, then the web's toast and state show. Fake gateway only.
 */
import '../helpers/no-network';
import { openBrowser } from './discover-mocks';
import './timing';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { UniversalCartScreen } from '../../src/screens/commerce/UniversalCartScreen';
import {
  __resetDepositReturnForTests,
  DEPOSIT_RETURN_POLLS,
  depositReturnTiming,
  getDepositReturn,
  markDepositPending,
} from '../../src/screens/commerce/data/depositReturn';
import { DEPOSIT_POLL_MS } from '../../src/screens/commerce/data/wallet';
import { budget, discoverWrapper, product, UUID, type Req } from './discover-helpers';

jest.setTimeout(30000);

const titles = () => __toastsForTests().map((t) => t.titleKey);

let appStateListeners: Array<(s: AppStateStatus) => void> = [];
beforeEach(() => {
  __resetDepositReturnForTests();
  depositReturnTiming.ms = 5;
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, cb) => {
    if (type === 'change') appStateListeners.push(cb as (s: AppStateStatus) => void);
    return { remove: () => (appStateListeners = appStateListeners.filter((l) => l !== cb)) } as never;
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  __clearToastsForTests();
  __resetDepositReturnForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const foreground = () => act(async () => appStateListeners.forEach((l) => l('active')));
const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const line = {
  id: 'line-1',
  cart_id: 'c1',
  item_type: 'partner_product',
  product_id: UUID(1),
  merchant_id: null,
  quantity: 1,
  unit_price_cents_snapshot: 1500,
  currency_snapshot: 'eur',
  source_surface: 'community',
  source_ref: null,
  status: 'active',
  metadata: {},
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

/** A fake gateway whose deposit answers the given statuses in order (the last repeats) and whose balance can change. */
function routes(statuses: string[]) {
  let reads = 0;
  const state = { balanceMinor: 2500 };
  const r = {
    'GET /universal-cart': { ok: true, cart: { id: 'c1' }, items: [line] },
    'GET /universal-cart/budget': budget,
    'GET /wallet/balance': () => ({ ok: true, accounts: [{ currency: 'EUR', balance_minor: state.balanceMinor, status: 'active', updated_at: '' }] }),
    [`GET /discover/product/${UUID(1)}`]: { ok: true, product: product(1) },
    'POST /wallet/deposits/create': { ok: true, deposit_id: 'dep-1', checkout_url: 'https://checkout.stripe.g1-test.example.org/s/1', expires_at: '' },
    'GET /wallet/deposits/dep-1': (_req: Req) => {
      const status = statuses[Math.min(reads, statuses.length - 1)];
      reads += 1;
      return { ok: true, deposit: { id: 'dep-1', amount_minor: 1000, currency: 'EUR', status, failure_reason: null, created_at: '', updated_at: '' } };
    },
  };
  return { routes: r, state };
}

const count = (requests: Req[], key: string) => requests.filter((q) => `${q.method} ${q.path}` === key).length;

async function startDeposit() {
  fireEvent.press(await screen.findByTestId('wallet-add-money'));
  await screen.findByTestId('add-money-dialog-content');
  fireEvent.changeText(screen.getByTestId('add-money-amount'), '10');
  await act(async () => {
    fireEvent.press(screen.getByTestId('add-money-continue'));
  });
}

describe('/universal-cart — Stripe deposit return leg', () => {
  it('the bound is 8 reads, 2.5 s apart (the web useDeposit interval)', () => {
    __resetDepositReturnForTests();
    expect(DEPOSIT_RETURN_POLLS).toBe(8);
    expect(depositReturnTiming).toEqual({ polls: 8, ms: DEPOSIT_POLL_MS });
    expect(DEPOSIT_POLL_MS).toBe(2500);
  });

  it('browser close → balance, cart, budget and the deposit are refetched; succeeded → the web toast, the new balance and the success state', async () => {
    openBrowser.mockResolvedValueOnce({ type: 'cancel' });
    const fake = routes(['succeeded']);
    const { wrapper, requests } = discoverWrapper(fake.routes);
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('wallet-balance')).toHaveTextContent(/25/);
    const before = { balance: count(requests, 'GET /wallet/balance'), cart: count(requests, 'GET /universal-cart'), budget: count(requests, 'GET /universal-cart/budget') };
    fake.state.balanceMinor = 3500; // the webhook credited the wallet while the browser was open
    await startDeposit();
    expect(openBrowser).toHaveBeenCalledWith('https://checkout.stripe.g1-test.example.org/s/1');
    await waitFor(() => expect(titles()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(1);
    await waitFor(() => expect(count(requests, 'GET /wallet/balance')).toBeGreaterThan(before.balance));
    expect(count(requests, 'GET /universal-cart')).toBeGreaterThan(before.cart);
    expect(count(requests, 'GET /universal-cart/budget')).toBeGreaterThan(before.budget);
    await waitFor(() => expect(screen.getByTestId('wallet-balance')).toHaveTextContent(/35/));
    expect(screen.getByTestId('deposit-return-status')).toHaveTextContent('Balance topped up');
    expect(getDepositReturn()).toEqual({ depositId: 'dep-1', status: 'succeeded' });
    await waitFor(() => expect(screen.queryByTestId('add-money-dialog-content')).toBeNull());
  });

  it('webhook lag: pending reads are polled until the deposit settles, then the poll stops', async () => {
    const fake = routes(['pending', 'processing', 'succeeded']);
    const { wrapper, requests } = discoverWrapper(fake.routes);
    render(<UniversalCartScreen />, { wrapper });
    await startDeposit();
    expect(screen.getByTestId('deposit-return-status')).toHaveTextContent('Confirming payment');
    await waitFor(() => expect(titles()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(3);
    await wait(60);
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(3);
    await foreground();
    await wait(20);
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(3);
  });

  it('a deposit still pending stops at the bound and stays pending; AppState active refetches and reads it again', async () => {
    const fake = routes(['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'succeeded']);
    const { wrapper, requests } = discoverWrapper(fake.routes);
    render(<UniversalCartScreen />, { wrapper });
    await startDeposit();
    await waitFor(() => expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(DEPOSIT_RETURN_POLLS));
    await wait(80);
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(DEPOSIT_RETURN_POLLS);
    expect(getDepositReturn()).toEqual({ depositId: 'dep-1', status: 'pending' });
    expect(titles()).toEqual([]);
    const balanceReads = count(requests, 'GET /wallet/balance');
    await foreground();
    await waitFor(() => expect(titles()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(DEPOSIT_RETURN_POLLS + 1);
    expect(count(requests, 'GET /wallet/balance')).toBeGreaterThan(balanceReads);
  });

  it('a failed deposit → transactionFailed and "Top-up failed"; a canceled one → depositCanceled', async () => {
    const failed = routes(['failed']);
    const first = discoverWrapper(failed.routes);
    const view = render(<UniversalCartScreen />, { wrapper: first.wrapper });
    await startDeposit();
    await waitFor(() => expect(titles()).toContain('toasts.wallet.transactionFailed'));
    expect(screen.getByTestId('deposit-return-status')).toHaveTextContent('Top-up failed');
    view.unmount();
    __clearToastsForTests();
    const canceled = routes(['canceled']);
    const second = discoverWrapper(canceled.routes);
    render(<UniversalCartScreen />, { wrapper: second.wrapper });
    await startDeposit();
    await waitFor(() => expect(titles()).toContain('toasts.wallet.depositCanceled'));
    expect(screen.getByTestId('deposit-return-status')).toHaveTextContent('Deposit canceled');
  });

  it('screen focus with a pending deposit reads it and refetches the wallet', async () => {
    markDepositPending('dep-1');
    const fake = routes(['succeeded']);
    const { wrapper, requests } = discoverWrapper(fake.routes);
    render(<UniversalCartScreen />, { wrapper });
    await waitFor(() => expect(titles()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(1);
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it('unmount stops the poll and removes the AppState listener', async () => {
    depositReturnTiming.ms = 40;
    const fake = routes(['pending']);
    const { wrapper, requests } = discoverWrapper(fake.routes);
    const view = render(<UniversalCartScreen />, { wrapper });
    await startDeposit();
    await waitFor(() => expect(count(requests, 'GET /wallet/deposits/dep-1')).toBeGreaterThanOrEqual(1));
    expect(appStateListeners.length).toBeGreaterThan(0);
    view.unmount();
    const reads = count(requests, 'GET /wallet/deposits/dep-1');
    await wait(200);
    expect(count(requests, 'GET /wallet/deposits/dep-1')).toBe(reads);
    expect(appStateListeners).toEqual([]);
    expect(getDepositReturn()).toEqual({ depositId: 'dep-1', status: 'pending' });
  });
});
