/**
 * VTID-05645 — native Business Opportunities (`/business/opportunities`): Pro gate, loading, loaded
 * (only commercial_sell pairings), empty, error with retry, and the two match actions (express
 * interest → `responded_by_b`, decline). Fake gateway and Supabase double only.
 */
import '../helpers/no-network';
import './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { OpportunitiesScreen } from '../../src/screens/business/OpportunitiesScreen';
import { createBusinessSupabaseDouble, fakeGateway, makeBusinessWrapper, resellerProfileRow } from './helpers';
import { router } from './mocks';

jest.setTimeout(30000);
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  router.navigate.mockClear();
  __clearToastsForTests();
});

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

const lead = (over: Record<string, unknown> = {}) => ({
  match_id: 'm-1',
  intent_a_id: 'i-1',
  vitana_id_a: 'mara',
  vitana_id_b: 'me',
  kind_pairing: 'commercial_buy::commercial_sell',
  score: 0.82,
  match_reasons: {},
  compass_aligned: true,
  state: 'new',
  partner_display_name: 'Mara Buyer',
  ...over,
});

function renderScreen(opts: { reseller?: boolean; gateway: ReturnType<typeof fakeGateway> }) {
  const dbl = createBusinessSupabaseDouble({ tables: { reseller_profiles: opts.reseller === false ? [] : [resellerProfileRow] } });
  const Wrapper = makeBusinessWrapper({ client: dbl.client, gateway: opts.gateway });
  return render(<OpportunitiesScreen />, { wrapper: Wrapper });
}

describe('opportunities', () => {
  it('loaded: only commercial_sell pairings are shown, with name, score and compass flag', async () => {
    const gateway = fakeGateway((p) =>
      p === '/intent-matches/incoming'
        ? { status: 200, body: { matches: [lead(), lead({ match_id: 'm-2', kind_pairing: 'activity_seek::activity_seek', partner_display_name: 'Not A Lead' })] } }
        : undefined,
    );
    renderScreen({ gateway });
    const card = await screen.findByTestId('lead-m-1');
    expect(within(card).getByText('Mara Buyer')).toBeTruthy();
    expect(within(card).getByText(en('businessNative.opportunities.matchScore', { score: 82 }))).toBeTruthy();
    expect(within(card).getByText(en('screens.intents.compassaligned'))).toBeTruthy();
    expect(screen.queryByTestId('lead-m-2')).toBeNull();
    expect(gateway.calls[0]).toMatchObject({ path: '/intent-matches/incoming', query: 'limit=50', method: 'GET' });
  });

  it('a member without a reseller profile sees the Pro gate and no lead call is made', async () => {
    const gateway = fakeGateway();
    renderScreen({ reseller: false, gateway });
    expect(await screen.findByTestId('opportunities-locked')).toBeTruthy();
    expect(gateway.calls.filter((c) => c.path.startsWith('/intent-matches'))).toEqual([]);
  });

  it('empty: explains and links to My Listings', async () => {
    renderScreen({ gateway: fakeGateway((p) => (p === '/intent-matches/incoming' ? { status: 200, body: { matches: [] } } : undefined)) });
    expect(await screen.findByTestId('opportunities-empty')).toBeTruthy();
    fireEvent.press(screen.getByText(en('screens.businessopportunities.myListings')));
    expect(router.navigate).toHaveBeenCalledWith('/business/listings');
  });

  it('error: shows the failure copy and retries', async () => {
    let fail = true;
    const gateway = fakeGateway((p) => (p === '/intent-matches/incoming' ? (fail ? { status: 500, body: {} } : { status: 200, body: { matches: [lead()] } }) : undefined));
    renderScreen({ gateway });
    expect(await screen.findByTestId('opportunities-error')).toBeTruthy();
    expect(screen.getByText(en('toasts.businessopportunities.couldNotLoadOpportunities'))).toBeTruthy();
    fail = false;
    fireEvent.press(screen.getByText(en('communityHubNative.common.retry')));
    expect(await screen.findByTestId('lead-m-1')).toBeTruthy();
  });

  it('express interest posts responded_by_b and reloads', async () => {
    const gateway = fakeGateway((p, m) => {
      if (p === '/intent-matches/incoming') return { status: 200, body: { matches: [lead()] } };
      if (p === '/intent-matches/m-1/state' && m === 'POST') return { status: 200, body: { state: 'responded_by_b' } };
      return undefined;
    });
    renderScreen({ gateway });
    fireEvent.press(await screen.findByTestId('lead-interest-m-1'));
    await waitFor(() => expect(gateway.calls.find((c) => c.path === '/intent-matches/m-1/state')?.body).toEqual({ state: 'responded_by_b' }));
    await waitFor(() => expect(gateway.calls.filter((c) => c.path === '/intent-matches/incoming').length).toBe(2));
    expect(__toastsForTests().some((t) => JSON.stringify(t).includes('interestRecorded'))).toBe(true);
  });

  it('decline posts to the decline endpoint', async () => {
    const gateway = fakeGateway((p, m) => {
      if (p === '/intent-matches/incoming') return { status: 200, body: { matches: [lead()] } };
      if (p === '/intent-matches/m-1/decline' && m === 'POST') return { status: 200, body: { state: 'declined' } };
      return undefined;
    });
    renderScreen({ gateway });
    fireEvent.press(await screen.findByTestId('lead-decline-m-1'));
    await waitFor(() => expect(gateway.calls.some((c) => c.path === '/intent-matches/m-1/decline' && c.method === 'POST')).toBe(true));
  });

  it('a failed interest call raises the error toast', async () => {
    const gateway = fakeGateway((p) => (p === '/intent-matches/incoming' ? { status: 200, body: { matches: [lead()] } } : { status: 500, body: {} }));
    renderScreen({ gateway });
    fireEvent.press(await screen.findByTestId('lead-interest-m-1'));
    await waitFor(() => expect(__toastsForTests().some((t) => JSON.stringify(t).includes('couldNotRecordInterest'))).toBe(true));
  });

  it('a declined lead shows its state instead of actions; an anonymous partner_seek match is redacted', async () => {
    const gateway = fakeGateway((p) =>
      p === '/intent-matches/incoming'
        ? { status: 200, body: { matches: [lead({ state: 'declined' }), lead({ match_id: 'm-3', kind_pairing: 'partner_seek::commercial_sell', vitana_id_a: null, partner_display_name: null })] } }
        : undefined,
    );
    renderScreen({ gateway });
    expect(await screen.findByTestId('lead-state-m-1')).toBeTruthy();
    expect(screen.queryByTestId('lead-interest-m-1')).toBeNull();
    expect(within(await screen.findByTestId('lead-m-3')).getByText(en('screens.intents.anonymousMatch'))).toBeTruthy();
  });

  it('the back button returns to the Business Hub', async () => {
    renderScreen({ gateway: fakeGateway((p) => (p === '/intent-matches/incoming' ? { status: 200, body: { matches: [] } } : undefined)) });
    fireEvent.press(await screen.findByTestId('opportunities-back'));
    expect(router.navigate).toHaveBeenCalledWith('/business');
  });
});
