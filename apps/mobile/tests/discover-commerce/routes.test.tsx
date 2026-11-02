/**
 * VTID-05511 — every route of the lane is reachable on a cold start: the real
 * route files under Expo Router (no router mock here), opened directly by URL
 * (deep link / push / ORB), each with its query or param; Expo Router ranks
 * them above the shell's catch-all, and `/discover` (the discover lane's
 * route) still falls through to the resolver. `resolveWebPath` reports all
 * nine ledger destinations native (the ORB refuses non-native ones), and the
 * nine ledger rows are `native`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import type React from 'react';
import { Text } from 'react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { resolveWebPath, NATIVE_PATTERNS } from '../../src/navigation/resolve';
import MarketplaceRoute from '../../app/(app)/discover/marketplace';
import DoctorsCoachesRoute from '../../app/(app)/discover/doctors-coaches';
import ProviderRoute from '../../app/(app)/discover/provider/[id]';
import OrdersRoute from '../../app/(app)/discover/orders';
import MyTicketsRoute from '../../app/(app)/my-tickets';
import { commerceWrapper, intent } from './helpers';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

/** The routes under a root layout that holds the test providers (the app's own root layout does this). */
const routesWith = (Wrapper: (p: { children: React.ReactNode }) => React.ReactElement) => ({
  _layout: () => (
    <Wrapper>
      <Slot />
    </Wrapper>
  ),
  ...routes,
});

const routes = {
  '(app)/discover/marketplace': MarketplaceRoute,
  '(app)/discover/doctors-coaches': DoctorsCoachesRoute,
  '(app)/discover/provider/[id]': ProviderRoute,
  '(app)/discover/orders': OrdersRoute,
  '(app)/my-tickets': MyTicketsRoute,
  '(app)/[...path]': () => <Text>resolver-route</Text>,
};

const ROWS: Array<[string, string]> = [
  ['DISCOVER.MARKETPLACE', '/discover/marketplace'],
  ['DISCOVER.MARKETPLACE_MINE', '/discover/marketplace?view=mine'],
  ['DISCOVER.MARKETPLACE_OPEN', '/discover/marketplace?view=open'],
  ['DISCOVER.DOCTORS_COACHES', '/discover/doctors-coaches'],
  ['DISCOVER.PROVIDER_PROFILE', '/discover/provider/1'],
  ['DISCOVER.ORDERS', '/discover/orders'],
  ['DISCOVER.ORDERS_ACTIVE', '/discover/orders?tab=active'],
  ['DISCOVER.ORDERS_HISTORY', '/discover/orders?tab=history'],
  ['DISCOVER.MY_TICKETS', '/my-tickets'],
];

describe('cold start: each destination opens its native screen', () => {
  it.each([
    ['/discover/marketplace', 'screen-marketplace'],
    ['/discover/marketplace?view=open', 'screen-marketplace'],
    ['/discover/doctors-coaches', 'screen-doctors-coaches'],
    ['/discover/provider/2', 'screen-provider-profile'],
    ['/discover/provider/99', 'provider-not-found'],
    ['/discover/orders', 'orders-active'],
    ['/discover/orders?tab=active', 'orders-active'],
    ['/discover/orders?tab=history', 'orders-history'],
    ['/my-tickets', 'screen-my-tickets'],
  ])('%s → %s', async (url, testID) => {
    const { wrapper } = commerceWrapper({ 'GET /intent-board': { intents: [] } }, { tables: { bookmarked_items: [], event_ticket_purchases: [], cj_orders: [], voucher_orders: [] } });
    renderRouter(routesWith(wrapper), { initialUrl: url });
    await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
  });

  it('/discover/marketplace?view=mine reads my intents (the view param reaches the screen)', async () => {
    const { wrapper, requests } = commerceWrapper({ 'GET /intents': { intents: [intent({ intent_id: 'm-1', title: 'My kettlebell' })] } });
    renderRouter(routesWith(wrapper), { initialUrl: '/discover/marketplace?view=mine' });
    await waitFor(() => expect(screen.getByText('My kettlebell')).toBeTruthy());
    expect(requests.some((r) => r.path === '/intents')).toBe(true);
    expect(requests.some((r) => r.path === '/intent-board')).toBe(false);
  });

  it('/discover/provider/3 shows that provider', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    renderRouter(routesWith(wrapper), { initialUrl: '/discover/provider/3' });
    await waitFor(() => expect(screen.getByTestId('provider-name')).toBeTruthy());
    expect(screen.getByTestId('provider-name').props.children).toBe('Luna Wellness Spa');
  });

  it('/discover (the discover lane) still falls through to the resolver', () => {
    const { wrapper } = commerceWrapper();
    renderRouter(routesWith(wrapper), { initialUrl: '/discover' });
    expect(screen.getByText('resolver-route')).toBeTruthy();
  });
});

describe('resolver + parity ledger', () => {
  it.each(ROWS)('%s (%s) resolves native, query kept', (_key, url) => {
    expect(resolveWebPath(url)).toMatchObject({ kind: 'native', href: url });
  });

  it('the dynamic native patterns are this lane’s provider route only', () => {
    expect(NATIVE_PATTERNS).toEqual(['/discover/provider/:id']);
    expect(resolveWebPath('/discover/provider').kind).not.toBe('native');
  });

  it('the nine ledger rows are native (owner kiro)', () => {
    const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; owner: string | null }> };
    for (const [key] of ROWS) {
      expect(ledger.rows.find((r) => r.key === key)).toMatchObject({ key, status: 'native', owner: 'kiro' });
    }
  });
});
