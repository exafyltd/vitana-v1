/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — `/commerce/team` (not a
 * member / admins only / the admin's roster with the built invite request
 * and the share sheet) and `/commerce/invites/:token/accept` (success lands
 * on the role's business home with that business active; the web's error
 * states).
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { ORG_ADMIN, ORG_STAFF, createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { CommerceTeamScreen } from '../../src/screens/business/CommerceTeamScreen';
import { CommerceAcceptInviteScreen, inviteStateFor } from '../../src/screens/business/CommerceAcceptInviteScreen';
import { activeOrgStore } from '../../src/identity/device-storage';
import { translate } from '../../src/i18n';

const de = (k: string, p?: Record<string, string>) => translate('de', k, p);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = {};
  activeOrgStore.set(null);
});

describe('/commerce/team', () => {
  it('not a member of any business', async () => {
    renderBusiness(<CommerceTeamScreen />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'GET /partner-orgs/mine': { organizations: [] } }) });
    expect(await screen.findByTestId('team-not-member')).toBeTruthy();
  });

  it('a staff member gets the honest admins-only card for the active business', async () => {
    activeOrgStore.set('org-2');
    renderBusiness(<CommerceTeamScreen />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'GET /partner-orgs/mine': { organizations: [ORG_ADMIN, ORG_STAFF] } }) });
    expect(await screen.findByTestId('team-admin-only')).toHaveTextContent(de('screens.commerceportal.orgOnboarding.teamAdminOnlyBody', { org: 'Lab Two' }), { exact: false });
  });

  it('the admin: members, pending invites (link + share), and an invite POST', async () => {
    const gateway = createCommerceGateway({
      'GET /partner-orgs/mine': { organizations: [ORG_ADMIN] },
      'GET /partner-orgs/org-1/members': { members: [{ id: 'mm-1', user_id: 'u-1', role: 'org_admin', granted_by: null, granted_at: '2026-09-01T00:00:00Z' }] },
      'GET /partner-orgs/org-1/invites': { invites: [{ id: 'inv-1', email: 'bo@example.org', role: 'staff', token: 'tok-1', expires_at: '2026-12-01T00:00:00Z', accepted_at: null }, { id: 'inv-2', email: 'old@example.org', role: 'staff', token: 'tok-2', expires_at: '2026-12-01T00:00:00Z', accepted_at: '2026-10-01T00:00:00Z' }] },
      'POST /partner-orgs/org-1/members/invite': { invite: { id: 'inv-3', email: 'cy@example.org', role: 'professional', token: 'tok-3', expires_at: '2026-12-01T00:00:00Z', accepted_at: null } },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as never);
    renderBusiness(<CommerceTeamScreen />, { supabase: createCommerceSupabase(), gateway });
    expect(await screen.findByTestId('team-org-name')).toHaveTextContent('Demo Studio');
    expect(await screen.findByTestId('roster-member-mm-1')).toBeTruthy();
    expect(await screen.findByTestId('roster-invite-link-inv-1')).toHaveTextContent('https://web.test/commerce/invites/tok-1/accept');
    expect(screen.queryByTestId('roster-invite-inv-2')).toBeNull();
    fireEvent.press(screen.getByTestId('roster-share-inv-1'));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ message: 'https://web.test/commerce/invites/tok-1/accept', title: de('screens.commerceportal.orgOnboarding.inviteCta') }));
    fireEvent.changeText(screen.getByTestId('roster-invite-email'), ' cy@example.org ');
    fireEvent.press(screen.getByTestId('roster-invite-role'));
    fireEvent.press(await screen.findByTestId('roster-invite-role-option-professional'));
    fireEvent.press(screen.getByTestId('roster-invite-send'));
    await waitFor(() => expect(gateway.find('POST', '/partner-orgs/org-1/members/invite')?.body).toEqual({ email: 'cy@example.org', role: 'professional' }));
    share.mockRestore();
  });
});

describe('/commerce/invites/:token/accept', () => {
  it('accepts on mount and lands on the admin home (team) with that business active', async () => {
    mockParams.current = { token: 'tok-1' };
    const gateway = createCommerceGateway({ 'POST /partner-orgs/invites/tok-1/accept': { partner_organization_id: 'org-9', role: 'org_admin' } });
    renderBusiness(<CommerceAcceptInviteScreen />, { supabase: createCommerceSupabase(), gateway });
    expect(screen.getByTestId('invite-pending')).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/commerce/team'));
    expect(activeOrgStore.getSnapshot()).toBe('org-9');
    expect(gateway.writes()).toHaveLength(1);
  });

  it('a staff invite lands on the orders', async () => {
    mockParams.current = { token: 'tok-2' };
    renderBusiness(<CommerceAcceptInviteScreen />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'POST /partner-orgs/invites/tok-2/accept': { partner_organization_id: 'org-8', role: 'staff' } }) });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/commerce/health-orders'));
  });

  it.each([
    [{ error: 'INVITE_EMAIL_MISMATCH' }, 'wrongEmail'],
    [{ error: 'Invite already accepted' }, 'already'],
    [{ error: 'Invite expired' }, 'expired'],
    [{ error: 'Invite not found' }, 'notFound'],
    [{ error: 'boom' }, 'failed'],
  ])('%j → %s with "Go to the portal"', async (body, state) => {
    mockParams.current = { token: 'tok-x' };
    renderBusiness(<CommerceAcceptInviteScreen />, { supabase: createCommerceSupabase(), gateway: createCommerceGateway({ 'POST /partner-orgs/invites/tok-x/accept': { __status: 400, __body: body } }) });
    expect(await screen.findByTestId(`invite-${state}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('invite-go-portal'));
    expect(router.navigate).toHaveBeenCalledWith('/commerce');
  });

  it('maps the gateway messages like the web', () => {
    expect(inviteStateFor('INVITE_EMAIL_UNVERIFIED')).toBe('wrongEmail');
    expect(inviteStateFor('HTTP 500')).toBe('failed');
  });
});
