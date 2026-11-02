/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list, fix round 1) —
 * "Find Friends" in the inbox Contacts tab (web ImportContactsButton →
 * ContactSyncModal, ContactsTabContent.tsx:96, :136): consent once; the phone
 * address book (expo-contacts, FAKED here — no real address book is read)
 * imported through `POST /connected-apps/android-contacts/import` as `native`;
 * a refused prompt → the error state with Open Settings; a device without an
 * address book → the .vcf file (expo-document-picker, faked) imported as
 * `vcf`; an account source that is off → Open Connected Apps; one that is on →
 * its hub sync; the results read back from `contacts` with Message / Invite;
 * the verify-phone hint and dialog. Every request lands in the fakes.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { __clearToastsForTests } from '../../../src/ports/ui';
import { deviceRegion } from '../../../src/ports/inbox';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { parseVCards } from '../../../src/screens/inbox/data/vcard';
import { ANNA, ME, TOKEN, inboxWrapper, loadedRoutes, loadedTables } from './helpers';

jest.mock('expo-contacts/legacy', () => ({
  Fields: { Name: 'name', Emails: 'emails', PhoneNumbers: 'phoneNumbers' },
  isAvailableAsync: jest.fn(async () => true),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getContactsAsync: jest.fn(async () => ({ data: [] })),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })) }));

const C = Contacts as unknown as { isAvailableAsync: jest.Mock; requestPermissionsAsync: jest.Mock; getContactsAsync: jest.Mock };
const D = DocumentPicker as unknown as { getDocumentAsync: jest.Mock };
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

beforeEach(async () => {
  await AsyncStorage.clear();
  C.requestPermissionsAsync.mockClear();
  C.getContactsAsync.mockClear();
  D.getDocumentAsync.mockClear();
  C.isAvailableAsync.mockResolvedValue(true);
  C.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  C.getContactsAsync.mockResolvedValue({
    data: [
      { name: 'Cleo Ray', emails: [{ email: 'cleo@example.org' }], phoneNumbers: [{ number: '+49 170 111' }] },
      { name: 'Dora Phone', emails: [], phoneNumbers: [{ number: '0664 222' }] },
    ],
  });
});
afterEach(() => {
  router.navigate.mockClear();
  openSettings.mockClear();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

// What the gateway import wrote: the rows the results read back (source "android").
const imported = [
  { id: 'c-cleo', user_id: ME, contact_user_id: 'u-cleo', contact_name: 'Cleo Ray', contact_phone: '+49 170 111', contact_email: 'cleo@example.org', is_on_platform: true, source: 'android', metadata: null },
  { id: 'c-dora', user_id: ME, contact_user_id: null, contact_name: 'Dora Phone', contact_phone: '0664 222', contact_email: null, is_on_platform: false, source: 'android', metadata: { phones_e164: ['+43664222'] } },
  { id: 'c-g', user_id: ME, contact_user_id: null, contact_name: 'Gus Google', contact_phone: null, contact_email: 'gus@example.org', is_on_platform: false, source: 'google', metadata: null },
];
const tables = { ...loadedTables, contacts: imported, profiles: [{ user_id: 'u-cleo', display_name: 'Cleo Ray', avatar_url: null, handle: 'cleo' }] };

const routes = (extra: Record<string, unknown> = {}) => ({
  ...loadedRoutes,
  'GET /connected-apps': { ok: true, apps: [{ id: 'google-contacts', status: 'on' }, { id: 'outlook-contacts', status: 'off' }] },
  'POST /connected-apps/android-contacts/import': { ok: true, result: { imported: 2 } },
  'POST /connected-apps/google-contacts/sync': { ok: true },
  'GET /invites/me': { ok: true, url: 'https://vitanaland.example.org/i/ME123' },
  ...extra,
});

async function openFindFriends(r = routes()) {
  const h = inboxWrapper(r, { tables });
  render(<InboxScreen />, { wrapper: h.wrapper });
  await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId('inbox-filter-contacts'));
  await waitFor(() => expect(screen.getByTestId('find-friends-button')).toBeTruthy());
  fireEvent.press(screen.getByTestId('find-friends-button'));
  await waitFor(() => expect(screen.getByTestId('find-friends-consent')).toBeTruthy());
  return h;
}

async function consent() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('find-friends-consent-continue'));
  });
  await waitFor(() => expect(screen.getByTestId('find-friends-import')).toBeTruthy());
}

describe('Find Friends', () => {
  it('asks for consent once, then imports the whole phone address book through the gateway as "native"', async () => {
    const { requests, queries } = await openFindFriends();
    expect(screen.getByText('How we handle your contacts')).toBeTruthy();
    await consent();
    expect(await AsyncStorage.getItem(`contact_sync_consent_${ME}`)).toBe('true');
    await waitFor(() => expect(screen.getByTestId('find-friends-phone')).toBeTruthy());
    expect(screen.getByTestId('find-friends-source-google-connected')).toBeTruthy();
    expect(screen.queryByTestId('find-friends-source-outlook-connected')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-phone'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-results')).toBeTruthy());
    expect(C.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(C.getContactsAsync).toHaveBeenCalledWith({ fields: ['name', 'emails', 'phoneNumbers'] });
    const post = requests.find((r) => r.method === 'POST' && r.path === '/connected-apps/android-contacts/import')!;
    expect(post.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(post.body).toEqual({
      contacts: [
        { name: 'Cleo Ray', emails: ['cleo@example.org'], phones: ['+49 170 111'] },
        { name: 'Dora Phone', emails: [], phones: ['0664 222'] },
      ],
      method: 'native',
      region: deviceRegion(),
    });
    const read = queries.find((q) => q.table === 'contacts' && q.columns?.startsWith('id, contact_name'))!;
    expect(read.filters).toEqual([
      ['eq', 'user_id', ME],
      ['in', 'source', ['android']],
      ['order', 'is_on_platform', { ascending: false }],
      ['order', 'contact_name', { ascending: true }],
    ]);
    expect(read.limit).toBe(500);
    const results = screen.getByTestId('find-friends-results');
    expect(within(results).getByText('Already on Vitanaland: 1')).toBeTruthy();
    expect(within(results).getByText('@cleo')).toBeTruthy();
    expect(within(results).getByText('Invite: 1')).toBeTruthy();
    expect(within(results).queryByText('Gus Google')).toBeNull();
    fireEvent.press(screen.getByTestId('message-member-u-cleo'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox/u/u-cleo');
  });

  it('invites a result contact through the shared invite channels and marks it invited', async () => {
    const { queries } = await openFindFriends();
    await consent();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-phone'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-results')).toBeTruthy());
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    // The Contacts tab behind the sheet lists the same row; press the one in the results.
    fireEvent.press(within(screen.getByTestId('find-friends-results')).getByTestId('invite-contact-c-dora'));
    await act(async () => {
      fireEvent.press(await screen.findByTestId('invite-channel-whatsapp'));
    });
    await waitFor(() => expect(openURL).toHaveBeenCalled());
    expect(String(openURL.mock.calls[0][0])).toMatch(/^https:\/\/wa\.me\/43664222\?text=/);
    await waitFor(() => expect(queries.some((q) => q.table === 'contacts' && q.op === 'update')).toBe(true));
    openURL.mockRestore();
  });

  it('a refused contacts prompt shows the permission error with Open Settings, and nothing is uploaded', async () => {
    C.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { requests } = await openFindFriends();
    await consent();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-phone'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-error')).toBeTruthy());
    expect(screen.getByText('No access to your contacts')).toBeTruthy();
    fireEvent.press(screen.getByTestId('find-friends-open-settings'));
    expect(openSettings).toHaveBeenCalled();
    expect(C.getContactsAsync).not.toHaveBeenCalled();
    expect(requests.some((r) => r.path === '/connected-apps/android-contacts/import')).toBe(false);
  });

  it('without an address book it takes a .vcf: parsed on the device, imported as "vcf"', async () => {
    C.isAvailableAsync.mockResolvedValue(false);
    const vcf = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:Jürgen Groß', 'TEL;TYPE=CELL:+43 664 333', 'EMAIL:j@example.org', 'END:VCARD'].join('\r\n');
    const b64 = Buffer.from(vcf, 'utf8').toString('base64');
    D.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ name: 'contacts.vcf', size: vcf.length, uri: 'file:///x.vcf', lastModified: 0, base64: b64 }] });
    const { requests } = await openFindFriends();
    await consent();
    await waitFor(() => expect(screen.getByTestId('find-friends-file')).toBeTruthy());
    expect(screen.getByTestId('find-friends-file-help')).toBeTruthy();
    expect(screen.queryByTestId('find-friends-phone')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-file'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-results')).toBeTruthy());
    expect(D.getDocumentAsync).toHaveBeenCalledWith(expect.objectContaining({ base64: true, multiple: false }));
    const post = requests.find((r) => r.path === '/connected-apps/android-contacts/import')!;
    expect(post.body.method).toBe('vcf');
    expect(post.body.contacts).toEqual([{ name: 'Jürgen Groß', emails: ['j@example.org'], phones: ['+43 664 333'] }]);
    expect(C.getContactsAsync).not.toHaveBeenCalled();
  });

  it('an empty .vcf shows the "no contacts in this file" error', async () => {
    C.isAvailableAsync.mockResolvedValue(false);
    D.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ name: 'x.vcf', size: 10, uri: 'file:///x', lastModified: 0, base64: Buffer.from('hello').toString('base64') }] });
    await openFindFriends();
    await consent();
    await waitFor(() => expect(screen.getByTestId('find-friends-file')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-file'));
    });
    await waitFor(() => expect(screen.getByText('No contacts in this file')).toBeTruthy());
  });

  it('an account that is off leads to Connected Apps; one that is on runs its hub sync', async () => {
    const { requests, queries } = await openFindFriends();
    await consent();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-source-outlook'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-connect')).toBeTruthy());
    expect(screen.getByText("Outlook Contacts isn't connected yet")).toBeTruthy();
    fireEvent.press(screen.getByTestId('find-friends-open-connected-apps'));
    // Matches the web: src/components/contacts/ContactSyncModal.tsx:284 navigates to /connectors.
    expect(router.navigate).toHaveBeenLastCalledWith('/connectors');

    fireEvent.press(screen.getByTestId('find-friends-button'));
    await waitFor(() => expect(screen.getByTestId('find-friends-import')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-source-google'));
    });
    await waitFor(() => expect(screen.getByTestId('find-friends-results')).toBeTruthy());
    expect(requests.some((r) => r.method === 'POST' && r.path === '/connected-apps/google-contacts/sync')).toBe(true);
    expect(queries.filter((q) => q.table === 'contacts' && q.columns?.startsWith('id, contact_name')).at(-1)!.filters[1]).toEqual(['in', 'source', ['google']]);
    expect(within(screen.getByTestId('find-friends-results')).getByText('Gus Google')).toBeTruthy();
  });

  it('shows the verify-phone hint while the number is unverified and sends the code request', async () => {
    const r = routes({ 'GET /me/phone': { ok: true, enabled: true, verified: false, phone_masked: null }, 'POST /me/phone/verification': { ok: true, phone_masked: '+43 ••• 33', resend_after_seconds: 30 } });
    const { requests } = await openFindFriends(r);
    await consent();
    await act(async () => {
      fireEvent.press(screen.getByTestId('find-friends-phone'));
    });
    await waitFor(() => expect(screen.getByTestId('verify-phone-hint')).toBeTruthy());
    fireEvent.press(screen.getByTestId('verify-phone-hint-action'));
    fireEvent.changeText(await screen.findByTestId('verify-phone-number'), '+43 664 333');
    await act(async () => {
      fireEvent.press(screen.getByTestId('verify-phone-send'));
    });
    await waitFor(() => expect(screen.getByTestId('verify-phone-code')).toBeTruthy());
    const send = requests.find((q) => q.method === 'POST' && q.path === '/me/phone/verification')!;
    expect(send.body).toEqual({ phone: '+43 664 333', region: deviceRegion() });
  });
});

describe('the .vcf reader (mirror of src/lib/vcard.ts)', () => {
  it('reads 3.0 and 2.1 quoted-printable cards, folded lines, N without FN, and skips empty cards', () => {
    const text = [
      'BEGIN:VCARD',
      'VERSION:2.1',
      'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:M=C3=BCller;Anna;;;',
      'item1.TEL;CELL:+49 1',
      '70 123',
      'END:VCARD',
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Ben',
      ' Cole',
      'EMAIL;TYPE=INTERNET:mailto:ben@example.org',
      'EMAIL:ben@example.org',
      'END:VCARD',
      'BEGIN:VCARD',
      'END:VCARD',
    ].join('\n');
    expect(parseVCards(text)).toEqual([
      { name: 'Anna Müller', emails: [], phones: ['+49 1'] },
      { name: 'BenCole', emails: ['ben@example.org'], phones: [] },
    ]);
  });
});
