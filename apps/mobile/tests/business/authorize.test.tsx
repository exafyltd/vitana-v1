/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce/connect/authorize`
 * (the ledger's `source: exclusion` commerce row): no / unknown id → invalid;
 * approved before → straight back; the supplier consent (grant `commerce`,
 * approve, the assistant's redirect handed to the OS, the redirect host,
 * deny, a failure); the Community consent (categories recorded FIRST, fail
 * closed). Supabase's OAuth server and the RPCs are doubles.
 */
import '../helpers/no-network';
import { mockParams } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createCommerceSupabase, renderBusiness } from './helpers';
import { CommerceConnectAuthorizeScreen, goTo } from '../../src/screens/business/CommerceConnectAuthorizeScreen';
import { translate } from '../../src/i18n';

const de = (k: string, p?: Record<string, string>) => translate('de', k, p);
const ok = (data: unknown) => ({ data, error: null });
let opened: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  opened = [];
  jest.spyOn(goTo, 'open').mockImplementation((url: string) => void opened.push(url));
});
afterEach(() => jest.restoreAllMocks());

const DETAILS = { authorization_id: 'az-1', client: { client_name: 'Claude' }, redirect_uri: 'https://claude.ai/api/mcp/auth_callback', scope: 'openid' };

it('no authorization id → invalid', async () => {
  mockParams.current = {};
  renderBusiness(<CommerceConnectAuthorizeScreen />, { supabase: createCommerceSupabase({ oauth: {} }) });
  expect(await screen.findByTestId('connect-invalid')).toHaveTextContent(de('screens.commerceconnect.invalid'));
});

it('an assistant approved before goes straight back', async () => {
  mockParams.current = { authorization_id: 'az-1' };
  renderBusiness(<CommerceConnectAuthorizeScreen />, { supabase: createCommerceSupabase({ oauth: { details: () => ok({ redirect_url: 'https://claude.ai/cb?code=1' }) } }) });
  expect(await screen.findByTestId('connect-redirecting')).toBeTruthy();
  expect(opened).toEqual(['https://claude.ai/cb?code=1']);
});

it('supplier consent: what the assistant may do, the redirect host; approve records the commerce grant, then follows the redirect', async () => {
  mockParams.current = { authorization_id: 'az-1' };
  const supabase = createCommerceSupabase({
    email: 'ana@shop.example',
    oauth: { details: () => ok(DETAILS), approve: () => ok({ redirect_url: 'https://claude.ai/api/mcp/auth_callback?code=abc' }) },
    rpc: { ai_connection_authorization_info: () => ok({ client_id: 'cl-1', client_name: 'Claude', redirect_host: 'claude.ai', product: 'commerce' }) },
  });
  renderBusiness(<CommerceConnectAuthorizeScreen />, { supabase });
  expect(await screen.findByTestId('connect-authorize')).toHaveTextContent(de('screens.commerceconnect.title', { client: 'Claude' }), { exact: false });
  expect(screen.getByTestId('connect-redirect-host')).toHaveTextContent(de('screens.commerceconnect.redirectsTo', { host: 'claude.ai' }));
  fireEvent.press(screen.getByTestId('connect-approve'));
  await waitFor(() => expect(opened).toEqual(['https://claude.ai/api/mcp/auth_callback?code=abc']));
  const order = supabase.calls.map((c) => c.fn);
  expect(order.indexOf('rpc.ai_connection_grant_from_authorization')).toBeLessThan(order.indexOf('oauth.approve'));
  expect(supabase.calls.find((c) => c.fn === 'rpc.ai_connection_grant_from_authorization')?.args).toEqual({ p_authorization_id: 'az-1', p_categories: ['commerce'] });
});

it('a failed decision says so and stays', async () => {
  mockParams.current = { authorization_id: 'az-1' };
  const supabase = createCommerceSupabase({ oauth: { details: () => ok(DETAILS), deny: () => ({ data: null, error: { message: 'nope' } }) } });
  renderBusiness(<CommerceConnectAuthorizeScreen />, { supabase });
  fireEvent.press(await screen.findByTestId('connect-deny'));
  expect(await screen.findByTestId('connect-failed')).toBeTruthy();
  expect(opened).toEqual([]);
});

it('community consent: the chosen categories are recorded before approving; a failed grant approves nothing', async () => {
  mockParams.current = { authorization_id: 'az-2' };
  let grantFails = true;
  const supabase = createCommerceSupabase({
    oauth: { details: () => ok({ ...DETAILS, authorization_id: 'az-2' }), approve: () => ok({ redirect_url: 'https://chatgpt.com/cb?code=z' }) },
    rpc: {
      ai_connection_authorization_info: () => ok({ client_id: 'cl-2', client_name: 'ChatGPT', redirect_host: 'chatgpt.com', product: 'community' }),
      ai_connection_grant_from_authorization: () => (grantFails ? { data: null, error: { message: 'down' } } : ok(null)),
    },
  });
  renderBusiness(<CommerceConnectAuthorizeScreen />, { supabase });
  expect(await screen.findByTestId('community-consent')).toBeTruthy();
  fireEvent(screen.getByTestId('consent-category-people'), 'onCheckedChange', false);
  fireEvent.press(screen.getByTestId('consent-approve'));
  expect(await screen.findByTestId('consent-failed')).toBeTruthy();
  expect(supabase.calls.some((c) => c.fn === 'oauth.approve')).toBe(false);
  grantFails = false;
  fireEvent.press(screen.getByTestId('consent-approve'));
  await waitFor(() => expect(opened).toEqual(['https://chatgpt.com/cb?code=z']));
  const grants = supabase.calls.filter((c) => c.fn === 'rpc.ai_connection_grant_from_authorization');
  expect(grants[grants.length - 1].args).toEqual({ p_authorization_id: 'az-2', p_categories: ['profile', 'matches', 'activities'] });
});
