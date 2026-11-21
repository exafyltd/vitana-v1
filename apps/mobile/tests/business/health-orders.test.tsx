/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce/health-orders`
 * (+ `/inbox`): loading, not a member, empty, loaded (status select vs.
 * badge per access), the Inbox tab for full access only, a failed list (reads
 * as empty, as on the web), and the built PATCH / upload / confirm-match
 * requests with the web's toasts.
 */
import '../helpers/no-network';
import { mockPath } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ORG_ADMIN, ORG_PRO, createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { CommerceHealthOrdersScreen } from '../../src/screens/business/CommerceHealthOrdersScreen';
import { __toastsForTests } from '../../src/ports/ui';
import { translate } from '../../src/i18n';

const de = (k: string) => translate('de', k);
const toasts = () => __toastsForTests().map((t) => t.titleKey);

const ORDER = { id: 'o-1', tenant_id: 't', user_id: 'm', partner_id: 'p', assigned_professional_user_id: 'someone-else', external_order_ref: 'EXT-1', test_name: 'Lipid panel', status: 'ordered', status_updated_at: '2026-10-01T10:00:00Z', ordered_at: '2026-10-01T09:00:00Z', partner_registry: { display_name: 'LabCo' } };
const ASSIGNED = { ...ORDER, id: 'o-2', test_name: 'Vitamin D', assigned_professional_user_id: 'u-1' };
const INBOX = { id: 'i-1', partner_id: 'p', raw_payload: {}, candidate_user_ids: [], reason: 'no_match', resolved: false, created_at: '2026-10-02T10:00:00Z', partner_registry: [{ display_name: 'LabCo' }], member_link_status: 'declined' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPath.current = '/commerce/health-orders';
});

it('not a member: the honest card, no order call', async () => {
  const gateway = createCommerceGateway({ 'GET /partner-orgs/mine': { organizations: [] }, 'GET /admin/partner-health/orders': { orders: [] } });
  renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('health-orders-not-member')).toHaveTextContent(de('screens.commerceportal.healthOrders.notAMemberTitle'), { exact: false });
  expect(gateway.find('GET', '/admin/partner-health/inbox')).toBeUndefined();
});

it('admin: orders with a status select, the inbox tab with its badge; the status change is a PATCH', async () => {
  const gateway = createCommerceGateway({
    'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] },
    'GET /admin/partner-health/orders': { orders: [ORDER] },
    'GET /admin/partner-health/inbox': { inbox: [INBOX, { ...INBOX, id: 'i-2', resolved: true }] },
    'PATCH /admin/partner-health/orders/o-1': { ok: true },
  });
  renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('order-o-1')).toHaveTextContent('Lipid panel', { exact: false });
  await waitFor(() => expect(screen.getByTestId('health-tab-inbox')).toHaveTextContent(`${de('screens.admin.inbox')} (1)`));
  fireEvent.press(screen.getByTestId('order-select-o-1'));
  fireEvent.press(await screen.findByTestId('order-select-o-1-option-processing'));
  await waitFor(() => expect(gateway.find('PATCH', '/admin/partner-health/orders/o-1')?.body).toEqual({ status: 'processing' }));
  await waitFor(() => expect(toasts()).toContain('screens.admin.statusUpdated'));
  fireEvent.press(screen.getByTestId('health-tab-inbox'));
  expect(await screen.findByTestId('member-link-badge-i-1')).toHaveTextContent(de('screens.admin.memberDeclined'));
  expect(screen.queryByTestId('inbox-i-2')).toBeNull();
});

it('/inbox opens on the Inbox tab; resolve proposes the member (confirm-match body)', async () => {
  mockPath.current = '/commerce/health-orders/inbox';
  const gateway = createCommerceGateway({
    'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] },
    'GET /admin/partner-health/orders': { orders: [] },
    'GET /admin/partner-health/inbox': { inbox: [{ ...INBOX, member_link_status: null }] },
    'POST /admin/partner-health/inbox/i-1/confirm-match': { ok: true, status: 'pending_member', inbox_id: 'i-1' },
  });
  renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway });
  fireEvent.press(await screen.findByTestId('inbox-resolve-i-1'));
  fireEvent.press(await screen.findByTestId('match-submit'));
  await waitFor(() => expect(toasts()).toContain('toasts.admin.confirmMatchRequiresFields'));
  fireEvent.changeText(screen.getByTestId('match-user'), 'user-9');
  fireEvent.changeText(screen.getByTestId('match-tenant'), 't-maxina');
  fireEvent.changeText(screen.getByTestId('match-test'), 'Lipid panel');
  fireEvent.press(screen.getByTestId('match-submit'));
  await waitFor(() => expect(gateway.find('POST', '/admin/partner-health/inbox/i-1/confirm-match')?.body).toEqual({ matched_user_id: 'user-9', matched_tenant_id: 't-maxina', test_name: 'Lipid panel', external_order_ref: null }));
  await waitFor(() => expect(toasts()).toContain('screens.admin.matchProposed'));
});

it('professional: only their assigned orders are actionable, no inbox tab; upload result validates the JSON', async () => {
  const gateway = createCommerceGateway({
    'GET /partner-orgs/mine': { organizations: [ORG_PRO] },
    'GET /admin/partner-health/orders': { orders: [ORDER, ASSIGNED] },
    'POST /admin/partner-health/inbox/o-2/upload-result': { ok: true },
  });
  renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('order-status-o-1')).toHaveTextContent('ordered');
  expect(screen.queryByTestId('order-select-o-1')).toBeNull();
  expect(screen.queryByTestId('health-tab-inbox')).toBeNull();
  expect(gateway.find('GET', '/admin/partner-health/inbox')).toBeUndefined();
  fireEvent.press(screen.getByTestId('order-upload-o-2'));
  fireEvent.changeText(await screen.findByTestId('upload-json'), '{not json');
  fireEvent.press(screen.getByTestId('upload-submit'));
  await waitFor(() => expect(toasts()).toContain('toasts.admin.invalidJson'));
  fireEvent.changeText(screen.getByTestId('upload-json'), '{"result_date":"2026-10-01","biomarkers":[]}');
  fireEvent.press(screen.getByTestId('upload-submit'));
  await waitFor(() => expect(gateway.find('POST', '/admin/partner-health/inbox/o-2/upload-result')?.body).toEqual({ order_id: 'o-2', result: { result_date: '2026-10-01', biomarkers: [] } }));
  await waitFor(() => expect(toasts()).toContain('screens.admin.resultUploaded'));
});

it('empty, and a failed list reads as empty (the web shows "no orders yet" too)', async () => {
  const gateway = createCommerceGateway({ 'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] }, 'GET /admin/partner-health/orders': { __status: 500, __body: { error: 'x' } }, 'GET /admin/partner-health/inbox': { inbox: [] } });
  renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway });
  expect(await screen.findByTestId('health-orders-empty')).toHaveTextContent(de('screens.admin.noOrdersYet'));
  fireEvent.press(screen.getByTestId('health-refresh'));
  await waitFor(() => expect(gateway.calls.filter((c) => c.path === '/admin/partner-health/orders').length).toBeGreaterThan(1));
});
