/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the portal's setup
 * sheets, each driven to its write and the BUILT request asserted: add a
 * product (kind → vertical → form; the shop record created on NO_MERCHANT;
 * a photo uploaded to `media-uploads`), CSV import (template to the share
 * sheet, dry run report, import), sales setup (only what changed), "Set up
 * with AI" (website → draft → review → apply with one setup key), connect a
 * shop (detect → connect; developer form), partner terms (accept body; a
 * newer version → ask again), the business profile, the setup chooser and
 * the copy-by-share of the MCP address.
 */
import '../helpers/no-network';
import { mockPickedFile } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ORG_ADMIN, createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { AddProductSheet } from '../../src/screens/business/components/AddProductSheet';
import { CatalogueImportSheet } from '../../src/screens/business/components/CatalogueImportSheet';
import { SalesSetupSheet } from '../../src/screens/business/components/SalesSetupSheet';
import { AiSetupSheet } from '../../src/screens/business/components/AiSetupSheet';
import { ManualConnectDialog } from '../../src/screens/business/components/ManualConnectDialog';
import { PartnerTermsSheet } from '../../src/screens/business/components/PartnerTermsSheet';
import { SetupChooser } from '../../src/screens/business/components/SetupChooser';
import { McpConnectPanel } from '../../src/screens/business/components/AgentConnect';
import { SetupHub } from '../../src/screens/business/components/SetupHub';
import { CSV_TEMPLATE } from '../../src/ports/commerce';
import { __toastsForTests } from '../../src/ports/ui';
import { translate } from '../../src/i18n';

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);
const toasts = () => __toastsForTests().map((t) => t.titleKey);

beforeEach(() => {
  jest.clearAllMocks();
  mockPickedFile.current = null;
});
afterEach(() => jest.restoreAllMocks());

const VERTICALS = {
  data: {
    verticals: [
      { key: 'wine', display_label: 'Wine', description: 'Bottles', icon: null, is_regulated: false, fields: [{ vertical_key: 'wine', field_key: 'abv', display_label: 'ABV', help_text: null, data_type: 'number', vocabulary: null, unit: '%', is_prominent: true, sort_order: 1 }] },
      { key: 'services', display_label: 'Services', description: null, icon: null, is_regulated: false, fields: [] },
    ],
    options: {},
  },
};

it('add a product: kind → vertical → form; NO_MERCHANT creates the shop record, then the product is saved', async () => {
  let merchant = false;
  const gateway = createCommerceGateway({
    'GET /vcaop/portal/my/verticals': VERTICALS,
    'POST /partner-onboarding/org-1/catalogue/products': () => (merchant ? { ok: true } : { __status: 409, __body: { error: 'NO_MERCHANT' } }),
    'PUT /partner-onboarding/org-1/catalogue/merchant': () => ((merchant = true), { ok: true }),
  });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///p.jpg', base64: 'AAEC', mimeType: 'image/jpeg', fileName: 'p.jpg', fileSize: 3 }] });
  const supabase = createCommerceSupabase();
  const onSaved = jest.fn();
  renderBusiness(<AddProductSheet open onOpenChange={jest.fn()} onSaved={onSaved} orgs={[ORG_ADMIN]} activeOrgId="org-1" />, { supabase, gateway });
  fireEvent.press(await screen.findByTestId('add-kind-product'));
  fireEvent.press(await screen.findByTestId('add-vertical-wine'));
  expect(screen.getByTestId('add-title')).toHaveTextContent(de('screens.commerceportal.addOffer.titleFor_product', { vertical: 'Wine' }));
  fireEvent.changeText(screen.getByTestId('pf-title'), 'Riesling');
  fireEvent.changeText(screen.getByTestId('pf-price'), '12,50');
  fireEvent.changeText(screen.getByTestId('pf-url'), 'https://shop.example/riesling');
  fireEvent.changeText(screen.getByTestId('pf-origin'), 'de');
  fireEvent.changeText(screen.getByTestId('pf-ships'), 'DE, at');
  fireEvent.changeText(screen.getByTestId('vf-abv'), '12.5');
  expect(screen.getByTestId('listing-strength-pct')).toHaveTextContent('100%');
  fireEvent.press(screen.getByTestId('product-image-add'));
  await waitFor(() => expect(supabase.uploads).toHaveLength(1));
  expect(supabase.uploads[0]).toMatchObject({ bucket: 'media-uploads', options: { upsert: true, contentType: 'image/jpeg' } });
  expect(supabase.uploads[0].path).toMatch(/^commerce-products\/u-1\/\d+\.jpg$/);
  fireEvent.press(screen.getByTestId('pf-submit'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const posts = gateway.calls.filter((c) => c.method === 'POST' && c.path === '/partner-onboarding/org-1/catalogue/products');
  expect(posts).toHaveLength(2);
  expect(posts[1].body).toEqual({
    title: 'Riesling',
    price_cents: 1250,
    currency: 'EUR',
    images: [expect.stringMatching(/^https:\/\/storage\.test\/media-uploads\/commerce-products\/u-1\//)],
    affiliate_url: 'https://shop.example/riesling',
    origin_country: 'DE',
    ships_to_countries: ['DE', 'AT'],
    category: 'wine',
    attributes: { abv: 12.5 },
  });
  expect(gateway.find('PUT', '/partner-onboarding/org-1/catalogue/merchant')?.body).toEqual({ vertical_key: 'fitness_equipment' });
  expect(toasts()).toContain('screens.commerceportal.productForm.saved');
});

it('add a product without a business asks to register first; a vertical load failure offers a retry', async () => {
  const onRegister = jest.fn();
  const { unmount } = renderBusiness(<AddProductSheet open onOpenChange={jest.fn()} onSaved={jest.fn()} orgs={[]} onRegister={onRegister} />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'GET /vcaop/portal/my/verticals': VERTICALS }) });
  fireEvent.press(await screen.findByTestId('add-register'));
  expect(onRegister).toHaveBeenCalled();
  unmount();
  renderBusiness(<AddProductSheet open onOpenChange={jest.fn()} onSaved={jest.fn()} orgs={[ORG_ADMIN]} />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'GET /vcaop/portal/my/verticals': { __status: 500 } }) });
  fireEvent.press(await screen.findByTestId('add-kind-service'));
  expect(await screen.findByTestId('add-verticals-failed')).toBeTruthy();
});

it('CSV import: the template goes to the share sheet; a picked file is checked (dry run) and then imported', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
  const gateway = createCommerceGateway({
    'POST /partner-onboarding/org-1/catalogue/products/import': (body: { dry_run: boolean }) => (body.dry_run ? { dry_run: true, valid_rows: 2, errors: [] } : { ok: true, imported: 2 }),
  });
  renderBusiness(<CatalogueImportSheet open onOpenChange={jest.fn()} adminOrgs={[ORG_ADMIN]} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.press(await screen.findByTestId('import-template'));
  await waitFor(() => expect(share).toHaveBeenCalled());
  const csv = `${CSV_TEMPLATE}\n`;
  mockPickedFile.current = { name: 'products.csv', size: csv.length, text: csv };
  fireEvent.press(screen.getByTestId('import-choose'));
  expect(await screen.findByTestId('import-ready')).toHaveTextContent(de('screens.commerceportal.catalogueImport.ready', { count: 2 }), { exact: false });
  fireEvent.press(screen.getByTestId('import-run'));
  expect(await screen.findByTestId('import-done')).toBeTruthy();
  const bodies = gateway.calls.filter((c) => c.path === '/partner-onboarding/org-1/catalogue/products/import').map((c) => c.body);
  expect(bodies).toEqual([{ csv, dry_run: true }, { csv, dry_run: false }]);
});

it('CSV import: not a CSV is refused before anything is sent; row errors are listed', async () => {
  const gateway = createCommerceGateway({
    'POST /partner-onboarding/org-1/catalogue/products/import': { __status: 400, __body: { error: 'invalid_rows', valid_rows: 1, errors: [{ line: 3, field: 'price', code: 'not_money' }] } },
  });
  renderBusiness(<CatalogueImportSheet open onOpenChange={jest.fn()} adminOrgs={[ORG_ADMIN]} />, { supabase: createCommerceSupabase(), gateway });
  mockPickedFile.current = { name: 'products.xlsx', size: 10, text: 'x' };
  fireEvent.press(await screen.findByTestId('import-choose'));
  expect(await screen.findByTestId('import-local-error')).toHaveTextContent(de('screens.commerceportal.catalogueImport.errors.not_csv'));
  expect(gateway.calls).toEqual([]);
  mockPickedFile.current = { name: 'p.csv', size: 10, text: 'title\nx' };
  fireEvent.press(screen.getByTestId('import-choose'));
  expect(await screen.findByTestId('import-row-errors')).toHaveTextContent(de('screens.commerceportal.catalogueImport.errors.not_money'), { exact: false });
});

it('sales setup sends only what the supplier set', async () => {
  const gateway = createCommerceGateway({ 'GET /partner-onboarding/org-1/catalogue': { products: [], merchant: { vertical_key: 'supplements' } }, 'PUT /partner-onboarding/org-1/catalogue/merchant': { ok: true } });
  const onSaved = jest.fn();
  renderBusiness(<SalesSetupSheet open onOpenChange={jest.fn()} org={ORG_ADMIN} onSaved={onSaved} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('sales-website'), 'shop.example');
  fireEvent.press(screen.getByTestId('sales-region-eu'));
  fireEvent.changeText(await screen.findByTestId('sales-typical'), '3');
  await waitFor(() => expect(gateway.find('GET', '/partner-onboarding/org-1/catalogue')).toBeTruthy());
  fireEvent.press(screen.getByTestId('sales-save'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(gateway.find('PUT', '/partner-onboarding/org-1/catalogue/merchant')?.body).toEqual({ vertical_key: 'supplements', avg_delivery_days_eu: 3, storefront_url: 'https://shop.example' });
});

it('set up with AI: website → draft → review → one apply with the setup key; a missing price blocks Create', async () => {
  const gateway = createCommerceGateway({
    'POST /commerce/ai-setup/draft': { draft: { website: 'https://shop.example', business: { display_name: 'Shop', category: 'lifestyle', country: 'DE', description: null, currency: 'EUR' }, products: [{ title: 'Mat', description: null, price_cents: null, currency: null, url: null, image: null, kind: 'product' }], source: 'website', notes: [] } },
    'POST /commerce/ai-setup/apply': { organization: { id: 'org-5', display_name: 'Shop' }, created_org: true, products_added: 1, products_replayed: 0, product_errors: [] },
  });
  const onDone = jest.fn();
  renderBusiness(<AiSetupSheet open onOpenChange={jest.fn()} onDone={onDone} onPreferManual={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('ai-website'), 'shop.example');
  fireEvent.press(screen.getByTestId('ai-read'));
  expect(await screen.findByTestId('ai-product-0')).toBeTruthy();
  expect(gateway.find('POST', '/commerce/ai-setup/draft')?.body).toEqual({ website: 'https://shop.example' });
  expect(screen.getByTestId('ai-create')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('ai-price-0'), '39');
  fireEvent.press(screen.getByTestId('ai-create'));
  expect(await screen.findByTestId('ai-done')).toHaveTextContent(de('screens.commerceportal.aiSetup.doneBody', { count: 1 }), { exact: false });
  expect(gateway.find('POST', '/commerce/ai-setup/apply')?.body).toEqual({
    setup_key: 'ai-setup:uuid-1',
    website: 'https://shop.example',
    business: { display_name: 'Shop', category: 'lifestyle', country: 'DE' },
    products: [{ title: 'Mat', description: null, price_cents: 3900, currency: 'EUR', url: null, image: null, kind: 'product' }],
  });
  expect(onDone).toHaveBeenCalled();
});

it('connect a shop: a recognised platform connects to the business in one tap; the developer form keeps every field', async () => {
  const gateway = createCommerceGateway({
    'POST /vcaop/portal/my/connections/detect-platform': { connector_id: 'shopify', provider_id: 'shopify-admin', name_hint: 'Shopify' },
    'POST /partner-onboarding/org-1/connections': { ok: true },
  });
  const onCreated = jest.fn();
  renderBusiness(<ManualConnectDialog open onOpenChange={jest.fn()} onCreated={onCreated} org={ORG_ADMIN} orgs={[ORG_ADMIN]} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('connect-url'), 'demo.myshopify.com');
  fireEvent.press(screen.getByTestId('connect-check'));
  expect(await screen.findByTestId('connect-detected')).toHaveTextContent(de('screens.commerceportal.connect.detected', { platform: 'Shopify' }), { exact: false });
  expect(gateway.find('POST', '/vcaop/portal/my/connections/detect-platform')?.body).toEqual({ url: 'https://demo.myshopify.com' });
  fireEvent.press(screen.getByTestId('connect-detected-go'));
  await waitFor(() => expect(onCreated).toHaveBeenCalled());
  expect(gateway.find('POST', '/partner-onboarding/org-1/connections')?.body).toEqual({ connector_id: 'shopify', provider_id: 'shopify-admin' });
});

it('connect: not recognised → docs (developer form with an uploaded OpenAPI) or help', async () => {
  const gateway = createCommerceGateway({ 'POST /vcaop/portal/my/connections/detect-platform': {}, 'POST /partner-onboarding/org-1/connections': { ok: true } });
  renderBusiness(<ManualConnectDialog open onOpenChange={jest.fn()} onCreated={jest.fn()} org={ORG_ADMIN} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.changeText(await screen.findByTestId('connect-url'), 'api.example');
  fireEvent.press(screen.getByTestId('connect-check'));
  fireEvent.press(await screen.findByTestId('connect-have-docs'));
  fireEvent.changeText(screen.getByTestId('connect-connector'), 'custom');
  fireEvent.changeText(screen.getByTestId('connect-provider'), 'acme');
  fireEvent.changeText(screen.getByTestId('connect-openapi'), '[1]');
  fireEvent.press(screen.getByTestId('connect-create'));
  expect(await screen.findByTestId('connect-openapi-hint')).toHaveTextContent(de('screens.commerceportal.connect.openapiInvalid'));
  mockPickedFile.current = { name: 'api.json', size: 20, text: '{"openapi":"3.0.0"}' };
  fireEvent.press(screen.getByTestId('connect-upload-openapi'));
  await waitFor(() => expect(screen.getByTestId('connect-openapi').props.value).toBe('{"openapi":"3.0.0"}'));
  fireEvent.press(screen.getByTestId('connect-create'));
  await waitFor(() => expect(gateway.find('POST', '/partner-onboarding/org-1/connections')?.body).toEqual({ connector_id: 'custom', provider_id: 'acme', openapi_document: { openapi: '3.0.0' } }));
});

const TERMS = (v: string) => ({ published: true, accepted: false, terms: { id: 't1', version: v, published_at: '2026-10-01', content_sha256: `sha-${v}`, binding_locale: 'de', binding: { title: 'AGB', body_md: '## 1\nText' }, locale: 'de', text: { title: 'AGB', body_md: '## 1\nText\na) Punkt' }, direction: 'ltr', fallback: false, available_locales: ['de', 'en'], shown_locale: 'de' } });

it('partner terms: never pre-ticked; accept sends the version and hash; a newer version means read and tick again', async () => {
  let version = '1.0';
  let stale = true;
  const gateway = createCommerceGateway({
    'GET /partner-onboarding/org-1/terms': () => TERMS(version),
    'POST /partner-onboarding/org-1/terms/accept': () => (stale ? ((stale = false), (version = '1.1'), { __status: 409, __body: { error: 'TERMS_VERSION_MISMATCH' } }) : { ok: true }),
  });
  const onAccepted = jest.fn();
  renderBusiness(<PartnerTermsSheet open onOpenChange={jest.fn()} orgId="org-1" onAccepted={onAccepted} />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('partner-terms-text')).toHaveTextContent('Punkt', { exact: false });
  expect(screen.getByTestId('partner-terms-accept')).toBeDisabled();
  fireEvent.press(screen.getByTestId('partner-terms-agree'));
  fireEvent.press(screen.getByTestId('partner-terms-accept'));
  expect(await screen.findByTestId('partner-terms-updated')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('partner-terms-accept')).toBeDisabled());
  fireEvent.press(screen.getByTestId('partner-terms-agree'));
  fireEvent.press(screen.getByTestId('partner-terms-accept'));
  await waitFor(() => expect(onAccepted).toHaveBeenCalled());
  const accepts = gateway.calls.filter((c) => c.path === '/partner-onboarding/org-1/terms/accept').map((c) => c.body);
  expect(accepts).toEqual([
    { terms_version: '1.0', content_sha256: 'sha-1.0', shown_locale: 'de' },
    { terms_version: '1.1', content_sha256: 'sha-1.1', shown_locale: 'de' },
  ]);
  expect(gateway.find('GET', '/partner-onboarding/org-1/terms?locale=de-DE')).toBeTruthy();
});

it('setup hub: the profile sheet saves country + website through PATCH /company; a load failure offers a retry', async () => {
  const gateway = createCommerceGateway({
    'GET /partner-onboarding/org-1': { organization: { country: null, website: null, lifecycle_state: 'draft' } },
    'GET /partner-onboarding/org-1/catalogue': { products: [], merchant: null },
    'GET /partner-onboarding/org-1/terms': { published: false },
    'GET /partner-onboarding/org-1/company-suggestions': { country: { value: 'AT', source: 'email_domain' }, website: { value: 'https://demo.at', source: 'email_domain' } },
    'PATCH /partner-onboarding/org-1/company': { ok: true },
  });
  renderBusiness(<SetupHub orgs={[ORG_ADMIN]} activeOrgId="org-1" onSelectOrg={jest.fn()} onAddProducts={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.press(await screen.findByTestId('setup-step-profile'));
  expect(await screen.findByTestId('profile-summary-website')).toHaveTextContent('https://demo.at');
  fireEvent.press(screen.getByTestId('profile-save'));
  await waitFor(() => expect(gateway.find('PATCH', '/partner-onboarding/org-1/company')?.body).toEqual({ country: 'AT', website: 'https://demo.at' }));
});

it('setup hub: a failed load says so with a retry', async () => {
  const gateway = createCommerceGateway({ 'GET /partner-onboarding/org-1': { __status: 500 }, 'GET /partner-onboarding/org-1/catalogue': { products: [] } });
  renderBusiness(<SetupHub orgs={[ORG_ADMIN]} activeOrgId="org-1" onSelectOrg={jest.fn()} onAddProducts={jest.fn()} />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('setup-hub-failed')).toHaveTextContent(de('screens.commerceportal.setupHub.loadFailed'), { exact: false });
  fireEvent.press(screen.getByTestId('setup-hub-retry'));
  await waitFor(() => expect(gateway.calls.filter((c) => c.path === '/partner-onboarding/org-1').length).toBe(2));
});

it('setup chooser: the four ways in, "in development" until AI setup is on', async () => {
  const onChoose = jest.fn();
  const { rerender } = renderBusiness(<SetupChooser open onOpenChange={jest.fn()} onChoose={onChoose} org={ORG_ADMIN} />, { supabase: createCommerceSupabase() });
  for (const id of ['ai', 'shop', 'manual', 'api']) expect(await screen.findByTestId(`setup-option-${id}`)).toBeTruthy();
  expect(screen.getByTestId('setup-option-ai-in-development')).toBeTruthy();
  fireEvent.press(screen.getByTestId('setup-option-manual'));
  expect(onChoose).toHaveBeenCalledWith('manual');
  rerender(<SetupChooser open onOpenChange={jest.fn()} onChoose={onChoose} org={ORG_ADMIN} aiReady />);
  expect(screen.queryByTestId('setup-option-ai-in-development')).toBeNull();
});

it('MCP panel: Copy hands the address to the share sheet and says "copied"', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
  renderBusiness(<McpConnectPanel />, { supabase: createCommerceSupabase() });
  expect(await screen.findByTestId('mcp-address')).toHaveTextContent('https://gateway.test/mcp');
  fireEvent.press(screen.getByTestId('mcp-copy'));
  await waitFor(() => expect(share).toHaveBeenCalledWith({ message: 'https://gateway.test/mcp' }));
  await waitFor(() => expect(toasts()).toContain('screens.commerceportal.mcpConnect.copied'));
  expect(screen.getByTestId('mcp-copy')).toHaveTextContent(de('screens.commerceportal.mcpConnect.copied'), { exact: false });
});
