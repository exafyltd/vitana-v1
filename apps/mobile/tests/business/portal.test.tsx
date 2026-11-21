/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce`, the
 * Commerce Portal: guest landing, the signed-in hero and its CTA order per
 * gateway flag, "Your organizations" loaded / empty / error, the setup hub,
 * the first-visit register sheet, supplier registration (the built request),
 * the MCP panel, the voice draft, and the `?connection=` / `?org=` drawers.
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ORG_ADMIN, ORG_STAFF, createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { CommercePortalScreen, __resetAutoRegisterForTests } from '../../src/screens/business/CommercePortalScreen';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { __toastsForTests } from '../../src/ports/ui';
import { translate } from '../../src/i18n';

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
  __resetAutoRegisterForTests();
});

const hub = {
  'GET /partner-onboarding/org-1': { organization: { country: 'DE', website: 'https://demo.example', lifecycle_state: 'draft' }, checklist: { steps: [{ key: 'verification', required: true, status: 'todo', missing: [] }], submit_ready: true } },
  'GET /partner-onboarding/org-1/catalogue': { products: [{ id: 'p1' }], merchant: null },
  'GET /partner-onboarding/org-1/terms': { published: false },
};

function routes(extra: Record<string, unknown> = {}) {
  return createCommerceGateway({
    'GET /vcaop/portal/my/connections': { data: [] },
    'GET /partner-orgs/mine': { organizations: [] },
    'GET /commerce/ai-setup/status': { enabled: false },
    'GET /partner-onboarding/company-suggestions': { country: null, website: null },
    ...extra,
  });
}

describe('guest', () => {
  it('shows the guest hero, the story landing and one sign-up CTA to /commerce/join', async () => {
    const supabase = createCommerceSupabase({ signedIn: false });
    const { gateway } = renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes() });
    expect(await screen.findByTestId('commerce-guest-hero')).toHaveTextContent(de('screens.commerceportal.guest.heroTitle'), { exact: false });
    expect(screen.getByTestId('commerce-guest-landing')).toBeTruthy();
    expect(screen.getByTestId('guest-steps')).toBeTruthy();
    // The one-step section waits for the gateway's MCP flag (unreachable here → hidden).
    expect(screen.queryByTestId('guest-one-step')).toBeNull();
    fireEvent.press(screen.getByTestId('guest-join'));
    expect(router.navigate).toHaveBeenCalledWith(`/commerce/join?redirectTo=${encodeURIComponent('/commerce')}`);
    // Guests have nothing to load: no account call is made.
    expect(gateway.calls).toEqual([]);
  });
});

describe('signed in, no business yet', () => {
  it('loads, shows the empty org list and opens the register sheet once by itself', async () => {
    const supabase = createCommerceSupabase({ tables: { profiles: [{ user_id: 'u-1', first_name: 'Ana', last_name: 'Berg' }] } });
    const { gateway } = renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes() });
    expect(await screen.findByTestId('orgs-empty')).toHaveTextContent(de('screens.commerceportal.orgOnboarding.orgsEmpty'));
    await waitFor(() => expect(screen.getByTestId('commerce-headline')).toHaveTextContent(de('screens.commerceportal.heroTitlePersonalizedNoOrg', { name: 'Ana' })));
    expect(await screen.findByTestId('register-step-title')).toHaveTextContent(de('screens.commerceportal.orgOnboarding.wizardStep1Title'));
    // Registering leads (primary) with no business, the AI button is the quiet second one.
    const buttons = within(screen.getByTestId('commerce-member-hero')).getAllByRole('button').map((b) => b.props.testID);
    expect(buttons).toEqual(['hero-register', 'hero-ai']);
    // Same calls as the web: connections, my orgs, AI status (+ the MCP metadata GET outside the gateway).
    const gets = gateway.calls.filter((c) => c.method === 'GET').map((c) => c.path);
    expect(gets).toEqual(expect.arrayContaining(['/vcaop/portal/my/connections', '/partner-orgs/mine', '/commerce/ai-setup/status']));
    // adminFetch's headers: bearer + tenant.
    const mine = gateway.find('GET', '/partner-orgs/mine');
    expect(mine?.headers).toMatchObject({ authorization: 'Bearer token-u-1', 'x-vitana-tenant': 't-maxina', 'content-type': 'application/json' });
  });

  it('registers the business with the derived short name and lands on the setup hub', async () => {
    const supabase = createCommerceSupabase();
    let registered = false;
    const gateway = routes({
      'GET /partner-orgs/mine': () => ({ organizations: registered ? [ORG_ADMIN] : [] }),
      'POST /partner-orgs/register': () => {
        registered = true;
        return { organization: { id: 'org-1', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', status: 'active' } };
      },
      ...hub,
    });
    renderBusiness(<CommercePortalScreen />, { supabase, gateway });
    fireEvent.press(await screen.findByTestId('register-category-fitness_wellness'));
    fireEvent.press(screen.getByTestId('register-next'));
    fireEvent.changeText(screen.getByTestId('register-name'), 'Demo Studio');
    fireEvent.changeText(screen.getByTestId('register-website'), 'demo.example');
    // The country: pick one in the list (no reliable suggestion here).
    fireEvent.press(screen.getByTestId('register-country-select'));
    fireEvent.press(await screen.findByTestId('register-country-select-option-DE'));
    fireEvent.press(screen.getByTestId('register-create'));
    expect(await screen.findByTestId('register-success')).toHaveTextContent('demo-studio', { exact: false });
    expect(gateway.find('POST', '/partner-orgs/register')?.body).toEqual({
      org_key: 'demo-studio',
      display_name: 'Demo Studio',
      org_type: 'fitness_wellness',
      commerce_vertical: 'general',
      country: 'DE',
      website: 'https://demo.example',
    });
    fireEvent.press(screen.getByTestId('register-continue-setup'));
    expect(await screen.findByTestId('setup-hub')).toBeTruthy();
  });

  it('a failed org load never reads as "no business yet": the error toast, no auto-open', async () => {
    const supabase = createCommerceSupabase();
    renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes({ 'GET /partner-orgs/mine': { __status: 500, __body: { error: 'boom' } } }) });
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('screens.commerceportal.orgOnboarding.orgsLoadFailed'));
    expect(screen.getByTestId('orgs-empty')).toBeTruthy();
    expect(screen.queryByTestId('register-step-title')).toBeNull();
  });
});

describe('signed in with businesses', () => {
  it('hoists the org list, shows the setup hub, the CSV import entry and the health-orders link', async () => {
    const supabase = createCommerceSupabase({ tables: { profiles: [{ user_id: 'u-1', display_name: 'Ana Berg' }] } });
    renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes({ 'GET /partner-orgs/mine': { organizations: [ORG_ADMIN, ORG_STAFF] }, ...hub }) });
    expect(await screen.findByTestId('my-org-org-1')).toBeTruthy();
    expect(screen.getByTestId('my-org-org-2')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('commerce-headline')).toHaveTextContent(de('screens.commerceportal.heroTitlePersonalizedWithOrg', { name: 'Ana', orgName: 'Demo Studio' })));
    // Hub: 2 of 5 server facts done (profile has a country, one product) → 40 %.
    expect(await screen.findByTestId('setup-hub-percent')).toHaveTextContent(de('screens.commerceportal.setupHub.readiness', { percent: 40 }));
    expect(screen.getByTestId('setup-step-profile-state-done')).toBeTruthy();
    expect(screen.getByTestId('setup-step-sales-state-todo')).toBeTruthy();
    expect(screen.getByTestId('setup-submit-submit')).toBeTruthy();
    expect(screen.getByTestId('orgs-catalogue-import')).toBeTruthy();
    fireEvent.press(screen.getByTestId('orgs-health-orders'));
    expect(router.navigate).toHaveBeenCalledWith('/commerce/health-orders');
    // A staff member's card cannot open the roster; the admin's opens ?org=.
    fireEvent.press(screen.getByTestId('my-org-org-1'));
    expect(router.setParams).toHaveBeenCalledWith({ org: 'org-1' });
    // Nothing opened by itself for a returning member.
    expect(screen.queryByTestId('register-step-title')).toBeNull();
  });

  it('submit for verification: one POST after the confirm, the server outcome shown', async () => {
    const supabase = createCommerceSupabase();
    const gateway = routes({
      'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] },
      ...hub,
      'POST /partner-onboarding/org-1/submit': { organization: { lifecycle_state: 'submitted' }, transitions: [{ from: 'draft', to: 'submitted' }] },
    });
    renderBusiness(<CommercePortalScreen />, { supabase, gateway });
    fireEvent.press(await screen.findByTestId('setup-submit-submit'));
    fireEvent.press(await screen.findByTestId('setup-submit-confirm'));
    expect(await screen.findByTestId('setup-submit-result-in_review')).toHaveTextContent(de('screens.commerceportal.setupHub.submitResultInReview'));
    expect(gateway.writes().filter((c) => c.path === '/partner-onboarding/org-1/submit')).toHaveLength(1);
  });

  it('MCP once the gateway serves it: the hero leads with it and the panel shows the address', async () => {
    const supabase = createCommerceSupabase();
    const spy = jest.spyOn(globalThis, 'fetch' as never).mockImplementation((async () => ({ ok: true, json: async () => ({ resource: 'https://gw/mcp', authorization_servers: ['https://auth'] }) })) as never);
    try {
      renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes({ 'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] }, ...hub }) });
      const hero = await screen.findByTestId('commerce-member-hero');
      await waitFor(() => expect(within(hero).getByTestId('hero-ai')).toHaveTextContent(de('screens.commerceportal.mcpConnect.cta')));
      expect(within(hero).getAllByRole('button').map((b) => b.props.testID)).toEqual(['hero-ai', 'hero-manual']);
      fireEvent.press(within(hero).getByTestId('hero-ai'));
      expect(await screen.findByTestId('mcp-connect-panel')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('AI setup switched on: a voice draft from Vitana opens the review card with her draft', async () => {
    const supabase = createCommerceSupabase();
    renderBusiness(<CommercePortalScreen />, { supabase, gateway: routes({ 'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] }, 'GET /commerce/ai-setup/status': { enabled: true }, ...hub }) });
    await waitFor(() => expect(screen.getByTestId('hero-ai')).toHaveTextContent(de('screens.commerceportal.aiSetup.cta')));
    await waitFor(() => expect(overlayBus.listenerCount('vitana:commerce-setup-draft')).toBeGreaterThan(0));
    act(() => {
      overlayBus.emit('vitana:commerce-setup-draft', {
        draft: { website: 'https://shop.example', business: { display_name: 'Shop', category: 'lifestyle', country: 'DE', description: null, currency: 'EUR' }, products: [{ title: 'Mat', description: null, price_cents: 3900, currency: 'EUR', url: null, image: null, kind: 'product' }], source: 'website', notes: [] },
      });
    });
    expect(await screen.findByTestId('ai-products-count')).toHaveTextContent(de('screens.commerceportal.aiSetup.productsFound', { count: 1 }));
    expect(screen.getByTestId('ai-price-0').props.value).toBe('39.00');
  });

  it('?connection= opens the workbench and ?org= the roster (deep-linkable drawers)', async () => {
    const supabase = createCommerceSupabase();
    mockParams.current = { connection: 'c-1', org: 'org-1' };
    renderBusiness(<CommercePortalScreen />, {
      supabase,
      gateway: routes({
        'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] },
        ...hub,
        'GET /vcaop/portal/my/connections/c-1': { data: { id: 'c-1', name: 'My Shop', connector_id: 'shopify', provider_id: 'p', state: 'mapping' } },
        'GET /vcaop/portal/my/connections/c-1/mapping-preview': { data: { state: 'mapping', pipeline_status: 'ready', mappings: [], pending_review: [] } },
        'GET /vcaop/portal/my/connections/c-1/activation-summary': { data: { state: 'mapping', version: null, certification: null, awaiting_platform_approval: false } },
        'GET /partner-orgs/org-1/members': { members: [] },
        'GET /partner-orgs/org-1/invites': { invites: [] },
      }),
    });
    expect(await screen.findByTestId('workbench-name')).toHaveTextContent('My Shop');
    expect(screen.getByTestId('connection-step-mapping')).toBeTruthy();
    expect(await screen.findByTestId('roster-title')).toHaveTextContent(de('screens.commerceportal.orgOnboarding.rosterTitle', { org: 'Demo Studio' }));
  });
});
