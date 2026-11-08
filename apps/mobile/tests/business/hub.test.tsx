/**
 * VTID-05645 — the native Business Hub shell (`/business`): every pill leaf renders from fixtures
 * (the five path routes and the `?tab=` variants), the Sales group is reseller-only, the pill moves
 * the content, and the snapshot KPIs, earning sheet, ledger, events, packages, inventory, campaigns,
 * referrals and clients render. Fixture and fake-gateway data only.
 */
import '../helpers/no-network';
import './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { BusinessHubScreen } from '../../src/screens/business/BusinessHubScreen';
import { pathToMobileTab, type BusinessTab } from '../../src/screens/business/tabs';
import { createBusinessSupabaseDouble, fakeGateway, inDays, makeBusinessWrapper, resellerProfileRow, TENANT, USER } from './helpers';
import { router } from './mocks';

jest.setTimeout(30000);
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => router.navigate.mockClear());

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const NOW = Date.now();
const ago = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const tables = {
  reseller_profiles: [resellerProfileRow],
  wallet_transactions: [
    { id: 'wt-1', to_user_id: USER, transaction_type: 'reseller_commission', status: 'completed', amount: 25, from_currency: 'EUR', created_at: ago(2) },
    { id: 'wt-2', to_user_id: USER, transaction_type: 'ticket_sale', status: 'completed', amount: 40, from_currency: 'EUR', created_at: ago(4) },
  ],
  global_community_events: [
    { id: 'ev-own', title: 'Sunrise Yoga Retreat', image_url: null, start_time: inDays(10), end_time: null, location: 'Berlin', created_by: USER },
    { id: 'ev-res', title: 'Breathwork Weekend', image_url: null, start_time: inDays(3), end_time: null, location: 'Online', created_by: 'u-other', resellable: true, resale_scope: 'public', default_reseller_commission_rate: 20, metadata: { price: 50 } },
  ],
  event_ticket_types: [{ event_id: 'ev-own', quantity_available: 30, is_active: true }],
  event_ticket_purchases: [
    { id: 'tp-1', event_id: 'ev-own', quantity: 2, total_amount: 80, buyer_id: 'b1', checked_in_at: ago(1), status: 'completed', created_at: ago(5) },
    { id: 'tp-2', event_id: 'ev-own', quantity: 1, total_amount: 40, buyer_id: 'b2', checked_in_at: null, status: 'completed', created_at: ago(6) },
    { id: 'tp-3', event_id: 'ev-own', quantity: 3, total_amount: 120, buyer_id: 'b1', checked_in_at: null, status: 'confirmed', created_at: ago(3) },
  ],
  reseller_attributions: [{ id: 'ra-1', reseller_id: 'rp-1', event_id: 'ev-res', sale_amount: 100, commission_amount: 20, commission_rate: 20, created_at: ago(2), ticket_purchase_id: 'tp-9', payout_id: null }],
  reseller_payouts: [{ id: 'po-1', reseller_profile_id: 'rp-1', status: 'paid_to_wallet', total_commission_amount: 15, paid_at: ago(20), created_at: ago(21) }],
  business_packages: [
    { id: 'pk-1', creator_id: USER, tenant_id: TENANT, title: 'Six Session Reset', description: 'Six guided sessions', price_cents: 45000, currency: 'EUR', original_price_cents: 60000, package_type: 'bundle', status: 'published', items: [{ quantity: 6 }], created_at: ago(9) },
  ],
  campaigns: [
    { id: 'cp-1', user_id: USER, name: 'Spring Push', status: 'active', start_date: '2026-03-01T00:00:00Z', end_date: '2026-04-01T00:00:00Z', cover_image_url: null, metadata: { event_id: 'ev-res' }, created_at: ago(8) },
    { id: 'cp-2', user_id: USER, name: 'Draft Idea', status: 'draft', start_date: null, end_date: null, cover_image_url: null, metadata: null, created_at: ago(7) },
  ],
};

const gatewayHandler = (path: string) => {
  if (path === '/partner-orgs/mine') return { status: 200, body: { organizations: [] } };
  if (path === '/vaea/drafts') return { status: 200, body: { drafts: [{ id: 'dr-1', reply_body: 'Try the breathwork weekend', match_reason: 'asked about stress', match_score: 0.8, status: 'shadow' }] } };
  if (path === '/vaea/catalog') return { status: 200, body: { items: [{ id: 'ci-1', tier: 'own', category: 'coaching', title: 'My Coaching Pack', personal_note: 'I use it daily', active: true }] } };
  if (path === '/vaea/detected-questions') return { status: 200, body: { questions: [{ id: 'dq-1', platform: 'maxina', author_handle: 'lena', message_body: 'Anyone know a good breathing course?', combined_score: 0.72, disposition: 'drafted', disposition_reason: null, extracted_topics: ['breathing'] }] } };
  return undefined;
};

function renderHub(tab: BusinessTab, overrides: { tables?: Record<string, Array<Record<string, unknown>>>; failTables?: string[]; gateway?: ReturnType<typeof fakeGateway> } = {}) {
  const dbl = createBusinessSupabaseDouble({ tables: { ...tables, ...(overrides.tables ?? {}) }, failTables: overrides.failTables });
  const gateway = overrides.gateway ?? fakeGateway(gatewayHandler);
  const Wrapper = makeBusinessWrapper({ client: dbl.client, gateway });
  const utils = render(<BusinessHubScreen initialTab={tab} />, { wrapper: Wrapper });
  return { ...utils, dbl, gateway };
}

describe('each pill leaf renders', () => {
  it('the snapshot: KPI cards, earning portal, partner card and the recent-activity ledger', async () => {
    renderHub('snapshot');
    expect(await screen.findByTestId('business-kpis')).toBeTruthy();
    // total = reseller commission 20 + direct gross (confirmed purchases: 120)
    await waitFor(() => expect(screen.getByTestId('kpi-total-value').props.children).toContain('140'));
    expect(screen.getByTestId('kpi-pending-value').props.children).toContain('20');
    expect(screen.getByTestId('kpi-wallet-value').props.children).toContain('15');
    expect(screen.getByTestId('earning-portal')).toBeTruthy();
    expect(screen.getByText(en('business.earning.startEarning'))).toBeTruthy();
    expect(screen.getByTestId('partner-card')).toBeTruthy();
    expect(screen.getByText(en('screens.commerceportal.orgOnboarding.registerAsPartnerTitle'))).toBeTruthy();
    expect(await screen.findByTestId('ledger-row-wt-1')).toBeTruthy();
    expect(screen.getByTestId('ledger-row-wt-2')).toBeTruthy();
  });

  it('services.services is the empty "no services yet" state with its create action', async () => {
    renderHub('services.services');
    expect(await screen.findByTestId('services-empty')).toBeTruthy();
    expect(screen.getByText(en('screens.businesshub.noServicesYet'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('services-create'));
    expect(router.navigate).toHaveBeenCalledWith('/commerce');
  });

  it('services.events lists the own ticketed events with sold, revenue and checked-in counts', async () => {
    renderHub('services.events');
    const card = await screen.findByTestId('event-ev-own');
    expect(within(card).getByText('Sunrise Yoga Retreat')).toBeTruthy();
    expect(within(card).getByText(new RegExp(en('businessNative.events.sold', { count: 3 })))).toBeTruthy();
    expect(within(card).getByText(new RegExp(en('businessNative.events.checkedIn', { count: 1 })))).toBeTruthy();
    expect(within(card).getByText(en('businessNative.events.buyers', { count: 2 }))).toBeTruthy();
    fireEvent.press(card);
    expect(await screen.findByTestId('event-ev-own-sales')).toBeTruthy();
  });

  it('services.packages lists the member packages with type, status, items and the savings', async () => {
    renderHub('services.packages');
    const card = await screen.findByTestId('package-pk-1');
    expect(within(card).getByText('Six Session Reset')).toBeTruthy();
    expect(within(card).getByText(en('businessNative.packages.type.bundle'))).toBeTruthy();
    expect(within(card).getByText(en('businessNative.packages.status.published'))).toBeTruthy();
    expect(within(card).getByText(en('businessNative.packages.save', { percent: 25 }))).toBeTruthy();
  });

  it('sales.inventory lists resellable events with commission and earn-per-ticket, and filters', async () => {
    renderHub('sales.inventory');
    const card = await screen.findByTestId('inventory-ev-res');
    expect(within(card).getByText('Breathwork Weekend')).toBeTruthy();
    expect(within(card).getByText(en('businessNative.inventory.commission', { type: en('businessNative.events.online'), rate: 20 }))).toBeTruthy();
    expect(within(card).getByText(en('businessNative.inventory.earnPerTicket', { amount: '€10' }))).toBeTruthy();
    fireEvent.press(screen.getByTestId('inventory-filter-high-commission'));
    expect(screen.getByTestId('inventory-ev-res')).toBeTruthy();
    fireEvent.press(screen.getByTestId('inventory-filter-popular'));
    expect(screen.getByTestId('inventory-ev-res')).toBeTruthy();
  });

  it('sales.promotions lists campaigns with status, the promoted event, and a create action', async () => {
    renderHub('sales.promotions');
    const card = await screen.findByTestId('campaign-cp-1');
    expect(within(card).getByText('Spring Push')).toBeTruthy();
    expect(within(card).getByText(en('businessNative.campaigns.status.active'))).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId('campaign-cp-1')).getByText(/Breathwork Weekend/)).toBeTruthy());
    expect(within(screen.getByTestId('campaign-cp-2')).getByText(en('businessNative.campaigns.edit'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('campaigns-create'));
    expect(router.navigate).toHaveBeenCalledWith('/sharing/campaigns');
  });

  it('sales.referrals shows the catalog and the detected questions, and the drafts strip above', async () => {
    renderHub('sales.referrals');
    expect(await screen.findByTestId('catalog-ci-1')).toBeTruthy();
    expect(await screen.findByTestId('drafts-strip')).toBeTruthy();
    fireEvent.press(screen.getByTestId('detected-toggle'));
    expect(await screen.findByTestId('detected-dq-1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('drafts-toggle'));
    expect(await screen.findByTestId('draft-dr-1')).toBeTruthy();
  });

  it('insights.clients switches between active, prospects and history', async () => {
    renderHub('insights.clients');
    expect(await screen.findByTestId('clients-active')).toBeTruthy();
    fireEvent.press(screen.getByTestId('clients-tab-prospects'));
    expect(screen.getByTestId('clients-prospects')).toBeTruthy();
    fireEvent.press(screen.getByText(en('screens.business.promoteViaSharing')));
    expect(router.navigate).toHaveBeenCalledWith('/sharing');
    fireEvent.press(screen.getByTestId('clients-tab-history'));
    expect(screen.getByTestId('clients-history')).toBeTruthy();
  });

  it.each([
    ['insights.performance', 'insight-performance', 'screens.businesshub.bookingAnalyticsComingSoon'],
    ['insights.earnings', 'insight-earnings', 'screens.businesshub.earningsBreakdownComingSoon'],
    ['insights.growth', 'insight-growth', 'screens.businesshub.growthAnalyticsComingSoon'],
  ] as const)('%s shows its coming-soon pane', async (leaf, testID, key) => {
    renderHub(leaf);
    expect(await screen.findByTestId(testID)).toBeTruthy();
    expect(screen.getByText(en(key))).toBeTruthy();
  });

  it('every path route opens its mapped pill', async () => {
    for (const [path, testID] of [
      ['/business/services', 'services-empty'],
      ['/business/clients', 'clients-panel'],
      ['/business/analytics', 'insight-performance'],
    ] as const) {
      const view = renderHub(pathToMobileTab(path));
      expect(await screen.findByTestId(testID)).toBeTruthy();
      view.unmount();
    }
  });
});

describe('states', () => {
  it('events: empty when the member has no ticketed events', async () => {
    renderHub('services.events', { tables: { global_community_events: [] } });
    expect(await screen.findByTestId('events-empty')).toBeTruthy();
    expect(screen.getByText(en('screens.business.noTicketedEventsYet'))).toBeTruthy();
  });

  it('events: error with a retry when the read fails', async () => {
    renderHub('services.events', { failTables: ['global_community_events'] });
    expect(await screen.findByTestId('events-error')).toBeTruthy();
    expect(screen.getByText(en('businessNative.events.loadError'))).toBeTruthy();
  });

  it('packages: empty and error', async () => {
    const empty = renderHub('services.packages', { tables: { business_packages: [] } });
    expect(await screen.findByTestId('packages-empty')).toBeTruthy();
    empty.unmount();
    renderHub('services.packages', { failTables: ['business_packages'] });
    expect(await screen.findByTestId('packages-error')).toBeTruthy();
  });

  it('campaigns: empty shows the create action', async () => {
    renderHub('sales.promotions', { tables: { campaigns: [] } });
    expect(await screen.findByTestId('campaigns-empty')).toBeTruthy();
    expect(screen.getByText(en('screens.reseller.noCampaignsYet'))).toBeTruthy();
  });

  it('inventory: a member without a reseller profile sees the activate hint', async () => {
    renderHub('sales.inventory', { tables: { reseller_profiles: [] } });
    expect(await screen.findByTestId('inventory-locked')).toBeTruthy();
  });

  it('inventory: empty offers the add-first-event action', async () => {
    renderHub('sales.inventory', { tables: { global_community_events: [] } });
    expect(await screen.findByTestId('inventory-empty')).toBeTruthy();
  });

  it('the drafts strip stays hidden when there are no drafts', async () => {
    renderHub('sales.referrals', { gateway: fakeGateway((p) => (p === '/vaea/drafts' ? { status: 200, body: { drafts: [] } } : gatewayHandler(p))) });
    await screen.findByTestId('catalog-ci-1');
    expect(screen.queryByTestId('drafts-strip')).toBeNull();
  });

  it('ledger: empty state when the member has no earnings', async () => {
    renderHub('snapshot', { tables: { wallet_transactions: [], event_ticket_purchases: [], reseller_attributions: [], reseller_payouts: [] } });
    expect(await screen.findByTestId('ledger-empty')).toBeTruthy();
  });
});

describe('the mode pill and sheets', () => {
  it('Sales is offered to resellers, hidden for others', async () => {
    const reseller = renderHub('snapshot');
    await waitFor(() => expect(screen.getByTestId('mode-pill')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    await waitFor(() => expect(screen.getByTestId('mode-sales')).toBeTruthy());
    reseller.unmount();

    renderHub('snapshot', { tables: { reseller_profiles: [] } });
    await screen.findByTestId('business-kpis');
    fireEvent.press(screen.getByTestId('mode-pill'));
    expect(screen.queryByTestId('mode-sales')).toBeNull();
    expect(screen.getByTestId('mode-services')).toBeTruthy();
  });

  it('picking a leaf in the sheet switches the content without leaving the screen', async () => {
    renderHub('snapshot');
    await screen.findByTestId('business-kpis');
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-services'));
    fireEvent.press(await screen.findByTestId('mode-services.packages'));
    expect(await screen.findByTestId('packages-list')).toBeTruthy();
    expect(screen.queryByTestId('business-kpis')).toBeNull();
  });

  it('the earning sheet lists four options; "add to inventory" opens the inventory pill', async () => {
    renderHub('snapshot');
    fireEvent.press(await screen.findByTestId('earning-portal-start'));
    for (const k of ['event', 'inventory', 'service', 'promotion']) expect(await screen.findByTestId(`earning-option-${k}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('earning-option-inventory'));
    expect(await screen.findByTestId('inventory-list')).toBeTruthy();
  });

  it('the Create button offers event, service and ticket selling', async () => {
    renderHub('snapshot');
    fireEvent.press(await screen.findByTestId('business-create'));
    for (const k of ['event', 'service', 'reseller']) expect(await screen.findByTestId(`business-type-${k}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('business-type-event'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events');
  });

  it('a KPI card opens the wallet', async () => {
    renderHub('snapshot');
    fireEvent.press(await screen.findByTestId('kpi-wallet'));
    expect(router.navigate).toHaveBeenCalledWith('/wallet');
  });
});

describe('read-only', () => {
  it('the hub makes no Supabase write and no non-GET gateway call on load', async () => {
    const view = renderHub('snapshot');
    await screen.findByTestId('ledger-row-wt-1');
    expect(view.dbl.writes).toEqual([]);
    expect(view.gateway.calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });
});
