/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox's
 * Contacts pill (web Messages.tsx:1351-1394, ContactsTabContent +
 * ContactListItem + AddContactDialog + InviteContactButton, review fix 1):
 * the pill renders the contacts instead of the list; the built reads are the
 * web `useContacts` reads; "Message" opens the existing DM or the New sheet
 * with the member preselected; add (manual, with the phone check), delete
 * (behind the confirmation), invite (invite link → the member's own app →
 * marked invited), remove phone contacts, search, empty state. Every request
 * lands in the fakes and is asserted; nothing reaches a live system.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { ANNA, ME, TOKEN, inboxWrapper, loadedRoutes, loadedTables } from './helpers';

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

afterEach(() => {
  router.navigate.mockClear();
  openURL.mockClear();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const CLEO = 'u-cleo';
const contactRows = [
  { id: 'c-anna', user_id: ME, contact_user_id: ANNA, contact_name: 'Anna', contact_phone: null, contact_email: null, is_on_platform: true, source: 'android', invite_sent_at: null },
  { id: 'c-cleo', user_id: ME, contact_user_id: CLEO, contact_name: 'Cleo', contact_phone: null, contact_email: null, is_on_platform: true, source: null, invite_sent_at: null },
  { id: 'c-dora', user_id: ME, contact_user_id: null, contact_name: 'Dora Phone', contact_phone: '+49 170 1234567', contact_email: null, is_on_platform: false, source: 'android', invite_sent_at: null, metadata: { phones_e164: ['+491701234567'] } },
  { id: 'c-eve', user_id: ME, contact_user_id: null, contact_name: 'Eve Mail', contact_phone: null, contact_email: 'eve@example.org', is_on_platform: false, source: null, invite_sent_at: '2026-10-20T10:00:00Z' },
  { id: 'c-other', user_id: 'u-someone-else', contact_user_id: null, contact_name: 'Not mine', is_on_platform: false },
];
const contactTables = {
  ...loadedTables,
  contacts: contactRows,
  profiles: [
    { user_id: ANNA, display_name: 'Anna Berg', avatar_url: 'https://g1-test.example.org/a.png', handle: 'anna' },
    { user_id: CLEO, display_name: 'Cleo Ray', avatar_url: null, handle: 'cleo' },
  ],
};
const contactRoutes = {
  ...loadedRoutes,
  'GET /invites/me': { ok: true, url: 'https://vitanaland.example.org/i/ME123' },
  'DELETE /connected-apps/android-contacts': { ok: true },
};

async function openContacts(sb: Record<string, unknown> = {}, routes: Record<string, unknown> = contactRoutes) {
  const h = inboxWrapper(routes, { tables: contactTables, ...sb });
  render(<InboxScreen />, { wrapper: h.wrapper });
  await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId('inbox-filter-contacts'));
  await waitFor(() => expect(screen.getByTestId('contacts-tab')).toBeTruthy());
  return h;
}

describe('inbox Contacts pill', () => {
  it('shows the Contacts pill after Groups and renders the contacts instead of the conversation list', async () => {
    await openContacts();
    expect(screen.getByText('Contacts')).toBeTruthy();
    expect(screen.queryByTestId(`inbox-card-${ANNA}`)).toBeNull();
    const onPlatform = screen.getByTestId('contacts-on-platform');
    expect(within(onPlatform).getByText('ON VITANA (2)')).toBeTruthy();
    // A member's profile name wins over the stored contact name.
    expect(within(onPlatform).getByText('Anna Berg')).toBeTruthy();
    expect(within(onPlatform).getByText('Cleo Ray')).toBeTruthy();
    const toInvite = screen.getByTestId('contacts-to-invite');
    expect(within(toInvite).getByText('INVITE TO VITANA (2)')).toBeTruthy();
    expect(within(toInvite).getByText('Dora Phone')).toBeTruthy();
    expect(within(toInvite).getByText('+49 170 1234567')).toBeTruthy();
    expect(within(toInvite).getByText(/^Invited /)).toBeTruthy();
    expect(screen.queryByText('Not mine')).toBeNull();
    expect(screen.getByTestId('remove-phone-contacts')).toBeTruthy();
  });

  it('builds the web useContacts reads: own rows by name, member profiles, global profiles for the ones without an avatar', async () => {
    const { queries, channels } = await openContacts();
    const own = queries.find((q) => q.table === 'contacts' && q.op === 'select');
    expect(own?.columns).toBe('*');
    expect(own?.filters).toEqual([
      ['eq', 'user_id', ME],
      ['order', 'contact_name', { ascending: true }],
    ]);
    const prof = queries.find((q) => q.table === 'profiles' && q.columns === 'user_id, display_name, avatar_url, handle');
    expect(prof?.filters).toEqual([['in', 'user_id', [ANNA, CLEO]]]);
    const global = queries.find((q) => q.table === 'global_community_profiles' && q.filters[0]?.[0] === 'in' && (q.filters[0][2] as string[]).includes(CLEO));
    expect(global?.filters).toEqual([['in', 'user_id', [CLEO]]]);
    const live = channels.find((c) => c.name.startsWith('contacts-changes'));
    expect(live?.bindings[0].filter).toEqual({ event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${ME}` });
  });

  it('"Message" on a member with a DM opens that conversation', async () => {
    await openContacts();
    fireEvent.press(screen.getByTestId('contact-c-anna-message'));
    expect(router.navigate).toHaveBeenLastCalledWith(`/inbox/u/${ANNA}`);
  });

  it('"Message" on a member without a DM opens the New sheet with them preselected (profiles read)', async () => {
    const { queries } = await openContacts();
    fireEvent.press(screen.getByTestId('contact-c-cleo-message'));
    await waitFor(() => expect(screen.getByTestId(`inbox-new-selected-${CLEO}`)).toBeTruthy());
    expect(within(screen.getByTestId(`inbox-new-selected-${CLEO}`)).getByText('Cleo Ray')).toBeTruthy();
    const pick = queries.find((q) => q.table === 'profiles' && q.columns === 'user_id, display_name, avatar_url');
    expect(pick?.filters).toEqual([['eq', 'user_id', CLEO]]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('adds a contact by hand: the phone check RPC, then the insert of the member row', async () => {
    const rpc = { check_phone_on_platform: () => ({ data: [], error: null }) };
    const { queries, rpcs } = await openContacts({ rpc });
    fireEvent.press(screen.getByTestId('contacts-add'));
    fireEvent.press(screen.getByTestId('contacts-add-manual'));
    fireEvent.changeText(screen.getByTestId('contacts-add-name'), ' Finn ');
    fireEvent.changeText(screen.getByTestId('contacts-add-phone'), '+44 7700 900123');
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-add-submit'));
    });
    await waitFor(() => expect(queries.some((q) => q.table === 'contacts' && q.op === 'insert')).toBe(true));
    expect(rpcs).toContainEqual({ name: 'check_phone_on_platform', args: { phone_number: '+44 7700 900123' } });
    const insert = queries.find((q) => q.table === 'contacts' && q.op === 'insert');
    expect(insert?.values).toEqual({ user_id: ME, contact_name: 'Finn', contact_phone: '+44 7700 900123', contact_email: undefined, is_on_platform: false, contact_user_id: null });
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'mailhub.findFriends.added.savedTitle')).toBe(true));
  });

  it('deletes a contact only after the confirmation, scoped to the member', async () => {
    const { queries } = await openContacts();
    fireEvent.press(screen.getByTestId('contact-c-dora-delete'));
    expect(queries.some((q) => q.op === 'delete')).toBe(false);
    await waitFor(() => expect(screen.getByText('Are you sure you want to delete Dora Phone? This action cannot be undone.')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-delete-confirm'));
    });
    await waitFor(() => expect(queries.some((q) => q.table === 'contacts' && q.op === 'delete')).toBe(true));
    expect(queries.find((q) => q.op === 'delete')?.filters).toEqual([
      ['eq', 'id', 'c-dora'],
      ['eq', 'user_id', ME],
    ]);
  });

  it('invites through WhatsApp with the member invite link, then marks the contact invited', async () => {
    const { queries, requests } = await openContacts();
    fireEvent.press(screen.getByTestId('invite-contact-c-dora'));
    for (const ch of ['whatsapp', 'sms', 'share']) expect(screen.getByTestId(`invite-channel-${ch}`)).toBeTruthy();
    expect(screen.queryByTestId('invite-channel-email')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('invite-channel-whatsapp'));
    });
    await waitFor(() => expect(openURL).toHaveBeenCalled());
    const link = requests.find((r) => r.path === '/invites/me');
    expect(link?.method).toBe('GET');
    expect(link?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    const message = "Hi Dora! I'm on Vitanaland, a community for a healthy, long life. Join me: https://vitanaland.example.org/i/ME123";
    expect(openURL).toHaveBeenCalledWith(`https://wa.me/491701234567?text=${encodeURIComponent(message)}`);
    await waitFor(() => expect(queries.some((q) => q.table === 'contacts' && q.op === 'update')).toBe(true));
    const mark = queries.find((q) => q.table === 'contacts' && q.op === 'update');
    expect(Object.keys(mark?.values ?? {})).toEqual(['invite_sent_at']);
    expect(mark?.filters).toEqual([
      ['eq', 'id', 'c-dora'],
      ['eq', 'user_id', ME],
    ]);
  });

  it('removes the phone contacts after the confirmation (gateway DELETE)', async () => {
    const { requests } = await openContacts();
    fireEvent.press(screen.getByTestId('remove-phone-contacts'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('contacts-remove-confirm'));
    });
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.path === '/connected-apps/android-contacts')).toBe(true));
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'mailhub.findFriends.remove.done')).toBe(true));
  });

  it('searches by name, phone or e-mail and shows the no-match line', async () => {
    await openContacts();
    fireEvent.press(screen.getByTestId('contacts-search'));
    fireEvent.changeText(screen.getByTestId('contacts-search-input'), 'eve@');
    expect(screen.getByText('Eve Mail')).toBeTruthy();
    expect(screen.queryByText('Dora Phone')).toBeNull();
    expect(screen.queryByTestId('contacts-on-platform')).toBeNull();
    fireEvent.changeText(screen.getByTestId('contacts-search-input'), 'zzz');
    expect(screen.getByTestId('contacts-no-match')).toBeTruthy();
  });

  it('shows the empty state without contacts', async () => {
    const h = inboxWrapper(contactRoutes, { tables: { ...loadedTables, contacts: [] } });
    render(<InboxScreen />, { wrapper: h.wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-filter-contacts'));
    await waitFor(() => expect(screen.getByTestId('contacts-empty')).toBeTruthy());
    expect(screen.getByText('No Contacts Yet')).toBeTruthy();
    expect(screen.getByTestId('contacts-add-first')).toBeTruthy();
    expect(screen.queryByTestId('contacts-search')).toBeNull();
  });
});
