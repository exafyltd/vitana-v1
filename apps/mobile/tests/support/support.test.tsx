/**
 * VTID-05432 — `/support` (SupportScreen): each `?tab=` renders its tab; the
 * Contact submit builds the feedback-ticket request against a MOCKED gateway
 * and fires nothing real; My tickets loaded / empty / error and confirm;
 * FAQ expand; Community links; the voice-report hand-off.
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { registerSupportReportHandler } from '../../src/ports/support';
import { SupportScreen, normalizeTab } from '../../src/screens/support/SupportScreen';
import { buildSupportContactBody, memberTicketStatus } from '../../src/screens/support/data/tickets';
import SupportRoute from '../../app/(app)/support';
import { makeWrapper, status } from './helpers';

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  mockParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
  registerSupportReportHandler(null);
});

const resolvedTicket = {
  id: 't-1',
  ticket_number: 'FB-0001',
  kind: 'bug',
  status: 'resolved',
  created_at: '2026-10-20T10:00:00Z',
  resolver_agent: 'nova',
  answer_md: 'We fixed the crash in the diary.',
  raw_transcript: 'The diary crashes when I save.',
};
const newTicket = { id: 't-2', ticket_number: 'FB-0002', kind: 'support_question', status: 'new', created_at: '2026-10-21T10:00:00Z' };

describe('normalizeTab (web TAB_ALIASES)', () => {
  it.each([
    ['contact', 'contact'],
    ['faqs', 'faqs'],
    ['knowledge-base', 'faqs'],
    ['Help', 'faqs'],
    ['community_help', 'community'],
    ['my tickets', 'tickets'],
    ['bogus', null],
    [undefined, null],
  ])('%s → %s', (input, out) => {
    expect(normalizeTab(input as string | undefined)).toBe(out);
  });
});

describe('SupportScreen tabs', () => {
  it('opens Contact by default (route file renders the screen)', () => {
    const { wrapper } = makeWrapper({});
    render(<SupportRoute />, { wrapper });
    expect(screen.getByTestId('screen-support')).toBeTruthy();
    expect(screen.getByTestId('support-contact')).toBeTruthy();
    expect(screen.getByTestId('support-quick-contact')).toBeTruthy();
  });

  it.each([
    ['contact', 'support-contact'],
    ['faqs', 'support-faqs'],
    ['community', 'support-community'],
    ['tickets', 'my-tickets'],
    ['knowledge', 'support-faqs'],
  ])('?tab=%s renders %s', async (tab, testID) => {
    mockParams.current = { tab };
    const { wrapper } = makeWrapper({ 'GET /feedback/tickets/mine?limit=100': { tickets: [] } });
    render(<SupportScreen />, { wrapper });
    expect(await screen.findByTestId(testID)).toBeTruthy();
  });

  it('the tab pill writes ?tab= back', () => {
    const { wrapper } = makeWrapper({});
    render(<SupportScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-faqs'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'faqs' });
    expect(screen.getByTestId('support-faqs')).toBeTruthy();
  });
});

describe('Contact submit (write — mocked gateway, nothing fired)', () => {
  it('builds the POST /feedback/tickets body and shows the ticket number', async () => {
    const { wrapper, gateway } = makeWrapper({
      'POST /feedback/tickets': { ok: true, id: 't-9', ticket_number: 'FB-0009' },
      'GET /feedback/tickets/mine?limit=100': { tickets: [] },
    });
    render(<SupportScreen />, { wrapper });
    expect(screen.queryByTestId('support-submit-card')).toBeNull();
    fireEvent.changeText(screen.getByTestId('support-message'), '  My invoice is wrong  ');
    fireEvent.press(screen.getByTestId('support-category'));
    fireEvent.press(await screen.findByTestId('support-category-billing'));
    fireEvent.press(screen.getByTestId('support-submit'));

    expect(await screen.findByTestId('created-ticket-number')).toBeTruthy();
    expect(screen.getByText(/FB-0009/)).toBeTruthy();
    const writes = gateway.writes();
    expect(writes).toHaveLength(1);
    expect(writes[0].method).toBe('POST');
    expect(writes[0].path).toBe('/feedback/tickets');
    expect(writes[0].body).toEqual(
      JSON.parse(JSON.stringify(buildSupportContactBody({ message: 'My invoice is wrong', category: 'billing', entryMethod: 'text', attachments: [] }))),
    );
    expect(writes[0].body).toMatchObject({
      raw_text: 'My invoice is wrong',
      kind: 'account_issue',
      surface: 'support',
      screen_path: 'support/contact:billing',
      structured_fields: { source: 'support_contact', category: 'billing', entry_method: 'text', attachments: [] },
    });

    fireEvent.press(screen.getByTestId('support-view-ticket'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'tickets', ticket: 't-9' });
    expect(await screen.findByTestId('my-tickets')).toBeTruthy();
  });

  it('without a category it is a support_question on support/contact', () => {
    expect(buildSupportContactBody({ message: ' hi ', category: '', entryMethod: 'text' })).toMatchObject({
      raw_text: 'hi',
      kind: 'support_question',
      screen_path: 'support/contact',
      structured_fields: { category: null },
    });
  });

  it('a failed submit shows the send error and keeps the message', async () => {
    const { wrapper } = makeWrapper({ 'POST /feedback/tickets': status(500) });
    render(<SupportScreen />, { wrapper });
    fireEvent.changeText(screen.getByTestId('support-message'), 'Help');
    fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('mobilesupport.errorSend'));
    expect(screen.queryByTestId('support-sent')).toBeNull();
    expect(screen.getByTestId('support-message').props.value).toBe('Help');
  });

  it('{ ok: false } from the gateway is a failure too', async () => {
    const { wrapper } = makeWrapper({ 'POST /feedback/tickets': { ok: false, error: 'nope' } });
    render(<SupportScreen />, { wrapper });
    fireEvent.changeText(screen.getByTestId('support-message'), 'Help');
    fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('mobilesupport.errorSend'));
  });
});

describe('Quick contact', () => {
  it('voice report shows orbUnavailable until the ORB registers', () => {
    const { wrapper } = makeWrapper({});
    render(<SupportScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('support-voice-report'));
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('supportTickets.orbUnavailable');
  });

  it('voice report opens the registered ORB support intake', () => {
    const handler = jest.fn(() => true);
    registerSupportReportHandler(handler);
    const { wrapper } = makeWrapper({});
    render(<SupportScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('support-voice-report'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(__toastsForTests()).toHaveLength(0);
  });
});

describe('My tickets', () => {
  it('lists tickets with the member status and the answer; confirm POSTs (mocked)', async () => {
    mockParams.current = { tab: 'tickets' };
    const { wrapper, gateway } = makeWrapper({
      'GET /feedback/tickets/mine?limit=100': { tickets: [resolvedTicket, newTicket] },
      'POST /feedback/tickets/t-1/confirm': { ok: true },
    });
    render(<SupportScreen />, { wrapper });
    expect(await screen.findByTestId('member-ticket-t-1')).toBeTruthy();
    expect(screen.getByTestId('member-ticket-t-2')).toBeTruthy();
    expect(screen.getByText('We fixed the crash in the diary.')).toBeTruthy();
    expect(screen.getByText('FB-0001')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ticket-confirm-t-1'));
    await waitFor(() => expect(gateway.writes().map((c) => `${c.method} ${c.path}`)).toEqual(['POST /feedback/tickets/t-1/confirm']));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.community.thanks'));
  });

  it('shows the empty state', async () => {
    mockParams.current = { tab: 'tickets' };
    const { wrapper } = makeWrapper({ 'GET /feedback/tickets/mine?limit=100': { tickets: [] } });
    render(<SupportScreen />, { wrapper });
    expect(await screen.findByTestId('my-tickets-empty')).toBeTruthy();
  });

  it('shows the error state with retry', async () => {
    mockParams.current = { tab: 'tickets' };
    const { wrapper } = makeWrapper({ 'GET /feedback/tickets/mine?limit=100': status(500) });
    render(<SupportScreen />, { wrapper });
    expect(await screen.findByTestId('my-tickets-error')).toBeTruthy();
  });

  it('a ?ticket= deep link opens My tickets with that ticket highlighted', async () => {
    mockParams.current = { ticket: 'fb-0002' };
    const { wrapper } = makeWrapper({ 'GET /feedback/tickets/mine?limit=100': { tickets: [resolvedTicket, newTicket] } });
    render(<SupportScreen />, { wrapper });
    const card = await screen.findByTestId('member-ticket-t-2');
    expect(JSON.stringify(card.props.style)).toContain('"borderWidth":2');
  });

  it('unknown pipeline statuses read as received', () => {
    expect(memberTicketStatus('some_future_state')).toBe('received');
    expect(memberTicketStatus('user_confirmed')).toBe('fixed');
  });
});

describe('FAQs and Community', () => {
  it('expands an FAQ answer', () => {
    mockParams.current = { tab: 'faqs' };
    const { wrapper } = makeWrapper({});
    render(<SupportScreen />, { wrapper });
    expect(screen.queryByTestId('faq-CreateAccount-answer')).toBeNull();
    fireEvent.press(screen.getByTestId('faq-CreateAccount'));
    expect(screen.getByTestId('faq-CreateAccount-answer')).toBeTruthy();
    fireEvent.press(screen.getByTestId('support-help-center'));
    expect(router.navigate).toHaveBeenCalledWith('/maxina_support');
  });

  it('community buttons open the groups', () => {
    mockParams.current = { tab: 'community' };
    const { wrapper } = makeWrapper({});
    render(<SupportScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('support-community-group'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/groups');
    expect(screen.getByTestId('support-community-stats')).toBeTruthy();
  });
});
