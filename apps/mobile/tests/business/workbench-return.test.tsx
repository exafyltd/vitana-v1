/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the connection workbench
 * and the return leg of its hosted authorize page (Shopify / SMART on FHIR):
 * open → the member is back (browser closed, or AppState `active` while the
 * flow is pending) → the connection is re-read → the new state is rendered;
 * the follow-up poll is bounded and cleared. Plus the mapping decisions,
 * sandbox tests and the revoke confirm.
 */
import '../helpers/no-network';
import './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { ConnectionWorkbench } from '../../src/screens/business/components/ConnectionWorkbench';
import { RETURN_POLL_COUNT, RETURN_POLL_MS } from '../../src/screens/business/data/external';
import { translate } from '../../src/i18n';

const de = (k: string) => translate('de', k);
const openBrowser = WebBrowser.openBrowserAsync as jest.Mock;

let appStateHandlers: Array<(s: string) => void> = [];
beforeEach(() => {
  jest.clearAllMocks();
  appStateHandlers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_t: string, h: (s: string) => void) => {
    appStateHandlers.push(h);
    return { remove: () => undefined };
  }) as never);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function connectionRoutes(state: { current: string }, extra: Record<string, unknown> = {}) {
  return createCommerceGateway({
    'GET /vcaop/portal/my/connections/c-1': () => ({ data: { id: 'c-1', name: 'My Shop', connector_id: 'shopify', provider_id: 'shopify-admin', state: state.current } }),
    'GET /vcaop/portal/my/connections/c-1/mapping-preview': () => ({
      data: { state: state.current, pipeline_status: 'ready', mappings: [{ id: 'm-1', source_schema: 'shop', source_field: 'price', canonical_entity: 'product', canonical_field: 'price_cents', confidence: 0.9, decided_by: 'factory', sensitive: false }], pending_review: ['m-1'] },
    }),
    'GET /vcaop/portal/my/connections/c-1/activation-summary': () => ({ data: { state: state.current, version: null, certification: null, awaiting_platform_approval: false } }),
    'POST /vcaop/portal/my/connections/c-1/shopify/authorize': { data: { authorize_url: 'https://demo.myshopify.test/admin/oauth/authorize?x=1' } },
    ...extra,
  });
}

const detailReads = (g: ReturnType<typeof createCommerceGateway>) => g.calls.filter((c) => c.method === 'GET' && c.path === '/vcaop/portal/my/connections/c-1').length;

it('Shopify: opens the authorize page in the in-app browser; closing it re-reads the connection and shows the new state', async () => {
  const state = { current: 'discovered' };
  const onChanged = jest.fn();
  const gateway = connectionRoutes(state);
  openBrowser.mockImplementation(async () => {
    state.current = 'mapping';
    return { type: 'dismiss' };
  });
  renderBusiness(<ConnectionWorkbench connectionId="c-1" onClose={jest.fn()} onChanged={onChanged} />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('workbench-oauth')).toBeTruthy();
  expect(screen.getByTestId('workbench-state')).toHaveTextContent(de('screens.partnerportal.states.discovered'));
  fireEvent.changeText(screen.getByTestId('workbench-shop'), 'demo.myshopify.com');
  fireEvent.press(screen.getByTestId('workbench-shopify'));
  await waitFor(() => expect(openBrowser).toHaveBeenCalledWith('https://demo.myshopify.test/admin/oauth/authorize?x=1'));
  expect(gateway.find('POST', '/vcaop/portal/my/connections/c-1/shopify/authorize')?.body).toEqual({ shop: 'demo.myshopify.com' });
  await waitFor(() => expect(screen.getByTestId('workbench-state')).toHaveTextContent(de('screens.partnerportal.states.mapping')));
  expect(screen.queryByTestId('workbench-oauth')).toBeNull();
  expect(onChanged).toHaveBeenCalled();
});

it('switching back to the app (AppState active) while the page is still open re-reads the state; the poll is bounded', async () => {
  const state = { current: 'authorization_required' };
  const gateway = connectionRoutes(state);
  openBrowser.mockImplementation(() => new Promise(() => undefined)); // the member switched apps; the browser never "closes"
  renderBusiness(<ConnectionWorkbench connectionId="c-1" onClose={jest.fn()} onChanged={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('workbench-shop'), 'demo.myshopify.com');
  fireEvent.press(screen.getByTestId('workbench-shopify'));
  await waitFor(() => expect(openBrowser).toHaveBeenCalled());
  const before = detailReads(gateway);
  state.current = 'mapping';
  jest.useFakeTimers();
  act(() => appStateHandlers.forEach((h) => h('active')));
  await act(async () => {
    await Promise.resolve();
  });
  expect(detailReads(gateway)).toBe(before + 1);
  for (let i = 0; i < RETURN_POLL_COUNT + 3; i++) {
    await act(async () => {
      jest.advanceTimersByTime(RETURN_POLL_MS);
      await Promise.resolve();
    });
  }
  expect(detailReads(gateway)).toBe(before + 1 + RETURN_POLL_COUNT);
  jest.useRealTimers();
  await waitFor(() => expect(screen.getByTestId('workbench-state')).toHaveTextContent(de('screens.partnerportal.states.mapping')));
  // A second "active" with no pending flow changes nothing.
  act(() => appStateHandlers.forEach((h) => h('active')));
  expect(detailReads(gateway)).toBe(before + 1 + RETURN_POLL_COUNT);
});

it('not configured: the honest toast, no browser', async () => {
  const state = { current: 'discovered' };
  const gateway = connectionRoutes(state, { 'POST /vcaop/portal/my/connections/c-1/shopify/authorize': { __status: 503, __body: { error: 'not_configured' } } });
  renderBusiness(<ConnectionWorkbench connectionId="c-1" onClose={jest.fn()} onChanged={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('workbench-shop'), 'x.myshopify.com');
  fireEvent.press(screen.getByTestId('workbench-shopify'));
  const { __toastsForTests } = jest.requireActual('../../src/ports/ui');
  await waitFor(() => expect(__toastsForTests().map((t: { titleKey: string }) => t.titleKey)).toContain('screens.commerceportal.connectOauth.notConfigured'));
  expect(openBrowser).not.toHaveBeenCalled();
});

it('mapping decision, sandbox tests and revoke (after the confirm) send the web requests', async () => {
  const state = { current: 'mapping' };
  const gateway = connectionRoutes(state, {
    'POST /vcaop/portal/my/connections/c-1/mapping-decisions': { ok: true },
    'POST /vcaop/portal/my/connections/c-1/sandbox-tests': { ok: true },
    'POST /vcaop/portal/my/connections/c-1/revoke': { ok: true },
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(((_t: string, _m: string, buttons: Array<{ onPress?: () => void; style?: string }>) => buttons.find((b) => b.style === 'destructive')?.onPress?.()) as never);
  renderBusiness(<ConnectionWorkbench connectionId="c-1" onClose={jest.fn()} onChanged={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.press(await screen.findByTestId('mapping-approve-m-1'));
  await waitFor(() => expect(gateway.find('POST', '/vcaop/portal/my/connections/c-1/mapping-decisions')?.body).toEqual({ mapping_id: 'm-1', decision: 'approve' }));
  await waitFor(() => expect(screen.getByTestId('workbench-test')).not.toBeDisabled());
  fireEvent.press(screen.getByTestId('workbench-test'));
  await waitFor(() => expect(gateway.find('POST', '/vcaop/portal/my/connections/c-1/sandbox-tests')).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId('workbench-revoke')).not.toBeDisabled());
  fireEvent.press(screen.getByTestId('workbench-revoke'));
  expect(alert).toHaveBeenCalledWith(de('screens.partnerportal.revoke'), de('screens.partnerportal.revokeConfirm'), expect.any(Array));
  await waitFor(() => expect(gateway.find('POST', '/vcaop/portal/my/connections/c-1/revoke')).toBeTruthy());
});
