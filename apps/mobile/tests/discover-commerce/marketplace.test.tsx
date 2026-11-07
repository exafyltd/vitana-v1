/**
 * VTID-05511 — /discover/marketplace (DISCOVER.MARKETPLACE, _OPEN, _MINE):
 * board load (both commercial kinds, limit 30, community role, merged newest
 * first), `?view=mine`, the view sheet, empty / error, the "+ Post" composer,
 * the intent card (kind pill, status, chips, match count, mine → match
 * detail) and its share sheet (built request only), and the compact utility
 * rail (web order, iOS gift-voucher gate as today, voucher checkout request).
 */
import '../helpers/no-network';
import { browser, router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { MarketplaceScreen } from '../../src/screens/marketplace-orders/MarketplaceScreen';
import { kindChips } from '../../src/screens/marketplace-orders/IntentCard';
import { parseRecipients } from '../../src/screens/marketplace-orders/IntentShareSheet';
import { FAIL, TOKEN, commerceWrapper, intent, setOS } from './helpers';

const buy = intent({ intent_id: 'i-buy', intent_kind: 'commercial_buy', title: 'Looking for a yoga mat', created_at: '2026-10-05T10:00:00Z', match_count: 1, kind_payload: {} });
const sell = intent({ intent_id: 'i-sell', created_at: '2026-10-09T10:00:00Z' });
const old = intent({ intent_id: 'i-old', title: 'Old offer', created_at: '2026-09-01T10:00:00Z', match_count: 0, kind_payload: {} });

const board = (req: { query: URLSearchParams }) => (req.query.get('kind') === 'commercial_buy' ? { intents: [buy] } : { intents: [old, sell] });

afterEach(() => {
  searchParams.current = {};
  router.setParams.mockClear();
  router.navigate.mockClear();
  browser.openBrowserAsync.mockClear();
  __clearToastsForTests();
  overlayBus.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('open view (default)', () => {
  it('loads both commercial kinds (limit 30) with the community role and merges them newest first', async () => {
    const { wrapper, requests } = commerceWrapper({ 'GET /intent-board': board });
    render(<MarketplaceScreen />, { wrapper });
    expect(screen.getByTestId('marketplace-loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    const boardCalls = requests.filter((r) => r.path === '/intent-board');
    expect(boardCalls.map((r) => [r.query.get('kind'), r.query.get('limit')]).sort()).toEqual([
      ['commercial_buy', '30'],
      ['commercial_sell', '30'],
    ]);
    for (const r of boardCalls) {
      expect(r.headers.authorization).toBe(`Bearer ${TOKEN}`);
      expect(r.headers['x-vitana-active-role']).toBe('community');
    }
    const ids = within(screen.getByTestId('marketplace-list-open'))
      .getAllByTestId(/^mo-intent-i-/)
      .map((n) => n.props.testID);
    expect(ids).toEqual(['mo-intent-i-sell', 'mo-intent-i-buy', 'mo-intent-i-old']);
    expect(screen.getByText('Open marketplace', { exact: false })).toBeTruthy();
    // nothing is written on mount (a cold start has no navigator yet); a picked view is
    expect(router.setParams).not.toHaveBeenCalled();
  });

  it('renders the intent card: kind pill, raw status, chips, match count; open cards are not links', async () => {
    const { wrapper } = commerceWrapper({ 'GET /intent-board': board });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mo-intent-i-sell')).toBeTruthy());
    const card = within(screen.getByTestId('mo-intent-i-sell'));
    expect(card.getByText("I'm selling")).toBeTruthy();
    expect(card.getByText('open')).toBeTruthy();
    expect(card.getByText('home goods')).toBeTruthy();
    expect(card.getByText('€100–200')).toBeTruthy();
    expect(card.getByText('📍 Berlin')).toBeTruthy();
    expect(card.getByText('2 matches')).toBeTruthy();
    expect(screen.queryByTestId('mo-intent-link-i-sell')).toBeNull();
  });

  it('empty board: the quiet state with the post CTA that opens the composer', async () => {
    const { wrapper } = commerceWrapper({ 'GET /intent-board': { intents: [] } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-empty-open')).toBeTruthy());
    expect(screen.getByText('The marketplace is quiet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('marketplace-empty-open-cta'));
    expect(screen.getByTestId('intent-composer')).toBeTruthy();
  });

  it('error: "Couldn\'t load — <error>"', async () => {
    const { wrapper } = commerceWrapper({ 'GET /intent-board': FAIL });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-error')).toBeTruthy());
    expect(screen.getByText("Couldn't load — Intent board failed (500)")).toBeTruthy();
  });
});

describe('mine view', () => {
  it('?view=mine lists my open intents, keeps the commercial kinds, and links each card to its match detail', async () => {
    searchParams.current = { view: 'mine' };
    const mineRows = [intent({ intent_id: 'm-1', title: 'My sofa' }), intent({ intent_id: 'm-2', intent_kind: 'activity_seek', title: 'Running buddy' })];
    const { wrapper, requests } = commerceWrapper({ 'GET /intents': { intents: mineRows } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-mine')).toBeTruthy());
    const call = requests.find((r) => r.path === '/intents');
    expect(call?.query.get('status')).toBe('open');
    expect(call?.headers['x-vitana-active-role']).toBe('community');
    expect(screen.getByText('My sofa')).toBeTruthy();
    expect(screen.queryByText('Running buddy')).toBeNull();
    fireEvent.press(screen.getByTestId('mo-intent-link-m-1'));
    expect(router.navigate).toHaveBeenCalledWith('/intents/match/m-1');
  });

  it('empty mine: "No listings yet" with the new-listing CTA', async () => {
    searchParams.current = { view: 'mine' };
    const { wrapper } = commerceWrapper({ 'GET /intents': { intents: [] } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-empty-mine')).toBeTruthy());
    expect(screen.getByText('No listings yet')).toBeTruthy();
    expect(screen.getByText('New listing')).toBeTruthy();
  });

  it('the view chip opens "Choose a view"; picking My listings switches the view and writes ?view=mine', async () => {
    const { wrapper, requests } = commerceWrapper({ 'GET /intent-board': board, 'GET /intents': { intents: [] } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    fireEvent.press(screen.getByTestId('marketplace-search-filter'));
    expect(screen.getByText('Choose a view')).toBeTruthy();
    fireEvent.press(screen.getByTestId('marketplace-view-mine'));
    await waitFor(() => expect(screen.getByTestId('marketplace-empty-mine')).toBeTruthy());
    expect(router.setParams).toHaveBeenLastCalledWith({ view: 'mine' });
    expect(requests.some((r) => r.path === '/intents')).toBe(true);
  });
});

describe('post + share', () => {
  it('+ Post opens the composer on "Selling" (defaultKind commercial_sell) and a post refreshes the list', async () => {
    const { wrapper, requests } = commerceWrapper({ 'GET /intent-board': board, 'POST /intents': { intent_id: 'new-1' } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    fireEvent.press(screen.getByTestId('marketplace-post'));
    expect(screen.getByTestId('composer-kind-commercial_sell').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.changeText(screen.getByTestId('composer-title'), 'Selling a bike');
    fireEvent.changeText(screen.getByTestId('composer-scope'), 'City bike in good condition, 7 gears, new tyres.');
    const before = requests.filter((r) => r.path === '/intent-board').length;
    await act(async () => fireEvent.press(screen.getByTestId('composer-submit')));
    await waitFor(() => expect(requests.find((r) => r.method === 'POST' && r.path === '/intents')).toBeTruthy());
    expect(requests.find((r) => r.method === 'POST' && r.path === '/intents')?.body).toMatchObject({ intent_kind: 'commercial_sell', title: 'Selling a bike' });
    await waitFor(() => expect(requests.filter((r) => r.path === '/intent-board').length).toBeGreaterThan(before));
  });

  it('the share sheet builds the in-app share request from the typed Vitana IDs', async () => {
    const { wrapper, requests } = commerceWrapper({
      'GET /intent-board': board,
      'POST /intents/i-sell/share': { matches_created: 2, recipients_already_shared: 0 },
    });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mo-intent-share-i-sell')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mo-intent-share-i-sell'));
    expect(screen.getAllByText('Share this post').length).toBeGreaterThan(0);
    fireEvent.changeText(screen.getAllByTestId('mo-share-recipients')[0], '@Dragan1, maria3 x');
    fireEvent.changeText(screen.getAllByTestId('mo-share-note')[0], ' see this ');
    await act(async () => fireEvent.press(screen.getAllByTestId('mo-share-send')[0]));
    const post = requests.find((r) => r.method === 'POST' && r.path === '/intents/i-sell/share');
    expect(post?.body).toEqual({ recipient_vitana_ids: ['dragan1', 'maria3'], note: 'see this', channel: 'in_app' });
    expect(post?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey?.endsWith('share.sharedMany'))).toBe(true));
  });

  it('parseRecipients + kindChips mirror the web rules', () => {
    expect(parseRecipients('@Abc, ab  dragan1;x @Maria3')).toEqual(['maria3']);
    expect(kindChips(intent({ intent_kind: 'commercial_buy', category: null, kind_payload: { price_floor: 5, price_ceiling: 9, urgency: 'soon' } }) as never, (k) => k)).toEqual(['€5–9', 'soon']);
  });
});

describe('compact utility rail', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });
  const order = () =>
    within(screen.getByTestId('mo-utility-rail'))
      .getAllByRole('button')
      .map((b) => b.props.testID)
      .filter((id: string | undefined) => !!id && !id.startsWith('mo-intent'));

  it('Android: Search · view chip · + Post · Life Compass · Gift Voucher (web order)', async () => {
    restore = setOS('android');
    const { wrapper } = commerceWrapper({ 'GET /intent-board': board });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    expect(order()).toEqual(['marketplace-search-open', 'marketplace-search-filter', 'marketplace-post', 'mo-life-compass', 'mo-gift-voucher']);
    const opened: string[] = [];
    overlayBus.on('vitana:open-life-compass', () => opened.push('life-compass'));
    fireEvent.press(screen.getByTestId('mo-life-compass'));
    expect(opened).toEqual(['life-compass']);
  });

  it('iOS: the gift voucher stays hidden (isIAPRestricted = Platform.OS === "ios", unchanged)', async () => {
    restore = setOS('ios');
    const { wrapper } = commerceWrapper({ 'GET /intent-board': board });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    expect(screen.queryByTestId('mo-gift-voucher')).toBeNull();
    expect(screen.queryByTestId('mo-voucher-modal-content')).toBeNull();
    expect(screen.getByTestId('mo-life-compass')).toBeTruthy();
  });

  it('the gift voucher builds the voucher checkout request (tier + returnTo) and opens the returned page in the system browser', async () => {
    restore = setOS('android');
    const { wrapper, log } = commerceWrapper({ 'GET /intent-board': board }, { functions: { 'stripe-create-voucher-checkout': { url: 'https://checkout.example.org/s/1' } } });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mo-gift-voucher'));
    expect(screen.getByTestId('mo-voucher-buy').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('mo-voucher-tier-experience'));
    await act(async () => fireEvent.press(screen.getByTestId('mo-voucher-buy')));
    expect(log.find((o) => o.op === 'function')).toEqual({ op: 'function', table: 'stripe-create-voucher-checkout', args: { tier: 'experience', returnTo: '/discover/marketplace' } });
    expect(browser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.example.org/s/1');
  });

  it('the search pill expands to the field and the × collapses it', async () => {
    const { wrapper } = commerceWrapper({ 'GET /intent-board': board });
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
    fireEvent.press(screen.getByTestId('marketplace-search-open'));
    expect(screen.getByTestId('marketplace-search-input').props.placeholder).toBe('Search marketplace...');
    fireEvent.press(screen.getByTestId('marketplace-search-close'));
    expect(screen.getByTestId('marketplace-search-open')).toBeTruthy();
  });
});
