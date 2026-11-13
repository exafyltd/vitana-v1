/**
 * VTID-05645 — native Business Listings (`/business/listings`): Pro gate, loading, loaded, empty,
 * error with retry, a listing opens its match detail, and "New listing" opens the composer
 * defaulted to commercial_sell. Fake gateway and Supabase double only.
 */
import '../helpers/no-network';
import './mocks';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { ListingsScreen } from '../../src/screens/business/ListingsScreen';
import { createBusinessSupabaseDouble, fakeGateway, makeBusinessWrapper, resellerProfileRow } from './helpers';
import { router } from './mocks';

jest.setTimeout(30000);
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => router.navigate.mockClear());

const en = (key: string) => translate('en', key);

const intent = (over: Record<string, unknown> = {}) => ({
  intent_id: 'in-1',
  requester_user_id: 'u-self',
  requester_vitana_id: 'me',
  tenant_id: 't',
  intent_kind: 'commercial_sell',
  category: null,
  title: 'Private breathwork coaching',
  scope: 'One-to-one coaching sessions for stress relief, online or in Berlin.',
  kind_payload: {},
  visibility: 'public',
  compass_alignment_at_post: null,
  status: 'open',
  match_count: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

function renderScreen(opts: { reseller?: boolean; gateway: ReturnType<typeof fakeGateway> }) {
  const dbl = createBusinessSupabaseDouble({ tables: { reseller_profiles: opts.reseller === false ? [] : [resellerProfileRow] } });
  const Wrapper = makeBusinessWrapper({ client: dbl.client, gateway: opts.gateway });
  return render(<ListingsScreen />, { wrapper: Wrapper });
}

describe('listings', () => {
  it('loaded: asks for commercial_sell and shows the offers; tapping one opens its match detail', async () => {
    const gateway = fakeGateway((p) => (p === '/intents' ? { status: 200, body: { intents: [intent()] } } : undefined));
    renderScreen({ gateway });
    const card = await screen.findByTestId('listing-in-1');
    expect(card).toBeTruthy();
    expect(screen.getByText('Private breathwork coaching')).toBeTruthy();
    expect(gateway.calls.find((c) => c.path === '/intents')?.query).toBe('kind=commercial_sell');
    fireEvent.press(card);
    expect(router.navigate).toHaveBeenCalledWith('/intents/match/in-1');
  });

  it('a member without a reseller profile sees the Pro gate, no New listing button and no intent call', async () => {
    const gateway = fakeGateway();
    renderScreen({ reseller: false, gateway });
    expect(await screen.findByTestId('listings-locked')).toBeTruthy();
    expect(screen.queryByTestId('listings-new')).toBeNull();
    expect(gateway.calls.filter((c) => c.path === '/intents')).toEqual([]);
  });

  it('empty: explains how to add an offer and offers the New listing action', async () => {
    renderScreen({ gateway: fakeGateway((p) => (p === '/intents' ? { status: 200, body: { intents: [] } } : undefined)) });
    expect(await screen.findByTestId('listings-empty')).toBeTruthy();
    expect(screen.getByText(en('screens.businesslistings.noListingsYetClick'))).toBeTruthy();
  });

  it('error: shows the failure copy and retries', async () => {
    let fail = true;
    const gateway = fakeGateway((p) => (p === '/intents' ? (fail ? { status: 500, body: {} } : { status: 200, body: { intents: [intent()] } }) : undefined));
    renderScreen({ gateway });
    expect(await screen.findByTestId('listings-error')).toBeTruthy();
    expect(screen.getByText(en('toasts.businesslistings.couldNotLoadListings'))).toBeTruthy();
    fail = false;
    fireEvent.press(screen.getByText(en('communityHubNative.common.retry')));
    expect(await screen.findByTestId('listing-in-1')).toBeTruthy();
  });

  it('New listing opens the composer', async () => {
    renderScreen({ gateway: fakeGateway((p) => (p === '/intents' ? { status: 200, body: { intents: [intent()] } } : undefined)) });
    fireEvent.press(await screen.findByTestId('listings-new'));
    expect(await screen.findByTestId('intent-composer')).toBeTruthy();
    expect(screen.getByTestId('composer-title')).toBeTruthy();
    // the commercial kinds carry the budget fields: the composer opened on commercial_sell
    expect(screen.getByTestId('composer-budget-min')).toBeTruthy();
  });

  it('the back button returns to the Business Hub', async () => {
    renderScreen({ gateway: fakeGateway((p) => (p === '/intents' ? { status: 200, body: { intents: [] } } : undefined)) });
    fireEvent.press(await screen.findByTestId('listings-back'));
    expect(router.navigate).toHaveBeenCalledWith('/business');
  });
});
