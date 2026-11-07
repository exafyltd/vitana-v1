/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — `/comm/talk-to-vitana`: the
 * phone layout (title, Community sections, the form, the AI note, the strip,
 * "Your reports"); an empty text is blocked; submit builds the
 * `POST /feedback/tickets` request against a MOCKED gateway and shows the
 * ticket notice with the number and the `?ticket=` link; a failed submit
 * toasts and keeps the text; the ticket list loaded / empty / error / retry /
 * confirm; the `?ticket=` deep link highlights the right ticket (by id or
 * FB-number, also beyond the first page). No network.
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { TalkToVitanaScreen } from '../../src/screens/ai-chat/TalkToVitanaScreen';
import { buildTalkTicketBody, TICKET_KINDS } from '../../src/screens/ai-chat/data/tickets';
import TalkToVitanaRoute from '../../app/(app)/comm/talk-to-vitana';
import { makeWrapper, status } from './helpers';

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  mockParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});

const MINE = 'GET /feedback/tickets/mine?limit=100';

const resolved = {
  id: 't-1',
  ticket_number: 'FB-0001',
  kind: 'bug',
  status: 'resolved',
  created_at: '2026-10-20T10:00:00Z',
  resolver_agent: 'devon',
  answer_md: 'We fixed the crash.',
  raw_transcript: 'The diary crashes when I save.',
  structured_fields: { voice_origin: true, severity: 'high' },
};
const fresh = { id: 't-2', ticket_number: 'FB-0002', kind: 'feedback', status: 'new', created_at: '2026-10-21T10:00:00Z' };

function typeText(value: string) {
  fireEvent.changeText(screen.getByTestId('talk-text'), value);
}

describe('Talk to Vitana layout (mobile web branch)', () => {
  it('the route renders the title, the Community sections, the form and the AI note', async () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: [] } });
    render(<TalkToVitanaRoute />, { wrapper });
    expect(screen.getByTestId('screen-talk-to-vitana')).toBeTruthy();
    expect(screen.getAllByText('Talk to Vitana').length).toBeGreaterThanOrEqual(2); // title + active section pill
    for (const id of ['overview', 'events-meetups', 'find-partner', 'live-rooms', 'media-hub', 'talk-to-vitana']) {
      expect(screen.getByTestId(`community-subnav-${id}`)).toBeTruthy();
    }
    expect(screen.getByTestId('community-subnav-talk-to-vitana').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText("What's on your mind?")).toBeTruthy();
    expect(screen.getByText('Topic')).toBeTruthy();
    expect(screen.getByTestId('talk-text').props.placeholder).toBe('Describe what happened, what you tried, what you expected…');
    expect(screen.getByTestId('talk-text').props.maxLength).toBe(10_000);
    expect(screen.getByText('Send to Vitana')).toBeTruthy();
    expect(screen.getByText(/A human reviews actions/)).toBeTruthy();
    expect(await screen.findByText('Your reports')).toBeTruthy();
  });

  it('a Community section pill navigates to its web path', () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: [] } });
    render(<TalkToVitanaScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('community-subnav-events-meetups'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
    fireEvent.press(screen.getByTestId('community-subnav-talk-to-vitana'));
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('the topic select lists the seven web kinds with their hints and defaults to feedback', () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: [] } });
    render(<TalkToVitanaScreen />, { wrapper });
    expect(TICKET_KINDS).toEqual(['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request']);
    expect(within(screen.getByTestId('talk-kind')).getByText('General feedback Ideas, thoughts, anything else')).toBeTruthy();
    fireEvent.press(screen.getByTestId('talk-kind'));
    for (const k of TICKET_KINDS) expect(screen.getByTestId(`talk-kind-${k}`)).toBeTruthy();
    expect(screen.getAllByText('Something is broken').length).toBeGreaterThan(0);
  });
});

describe('submit', () => {
  it('blocks an empty or blank text: the button is disabled and nothing is posted', () => {
    const { wrapper, gateway } = makeWrapper({ [MINE]: { tickets: [] } });
    render(<TalkToVitanaScreen />, { wrapper });
    const send = screen.getByTestId('talk-send');
    expect(send.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(send);
    typeText('   \n ');
    expect(screen.getByTestId('talk-send').props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(screen.getByTestId('talk-send'));
    expect(gateway.writes()).toEqual([]);
  });

  it('posts the web body through the community gateway and shows the ticket notice with the ?ticket= link', async () => {
    let created = false;
    const { wrapper, gateway } = makeWrapper({
      [MINE]: () => ({ tickets: created ? [{ ...fresh, id: 't-9', ticket_number: 'FB-0042' }] : [] }),
      'POST /feedback/tickets': () => {
        created = true;
        return { ok: true, id: 't-9', ticket_number: 'FB-0042' };
      },
    });
    render(<TalkToVitanaScreen />, { wrapper });
    await screen.findByTestId('talk-tickets-empty');
    fireEvent.press(screen.getByTestId('talk-kind'));
    fireEvent.press(screen.getByTestId('talk-kind-bug'));
    typeText('  The diary crashes when I save.  ');
    fireEvent.press(screen.getByTestId('talk-send'));

    expect(await screen.findByTestId('ticket-created')).toBeTruthy();
    expect(screen.getByText('Thanks – your ticket is created')).toBeTruthy();
    expect(screen.getByText('Your ticket number: FB-0042')).toBeTruthy();
    const [post] = gateway.writes();
    expect(post.method).toBe('POST');
    expect(post.path).toBe('/feedback/tickets');
    expect(post.headers['x-vitana-active-role']).toBe('community');
    expect(post.headers['content-type']).toBe('application/json');
    expect(post.body).toMatchObject({ raw_text: 'The diary crashes when I save.', kind: 'bug', screen_path: '/comm/talk-to-vitana' });
    // The form resets (web setText('') / setKind('feedback')) and the list refetches.
    expect(screen.getByTestId('talk-text').props.value).toBe('');
    expect(within(screen.getByTestId('talk-kind')).getByText('General feedback Ideas, thoughts, anything else')).toBeTruthy();
    expect(await screen.findByTestId('talk-ticket-t-9')).toBeTruthy();
    expect(gateway.count('GET', '/feedback/tickets/mine?limit=100')).toBe(2);

    fireEvent.press(screen.getByTestId('ticket-created-link'));
    expect(router.setParams).toHaveBeenCalledWith({ ticket: 't-9' });
  });

  it('buildTalkTicketBody carries the app version when known', () => {
    expect(buildTalkTicketBody(' hi ', 'feedback', '1.2.3')).toEqual({ raw_text: 'hi', kind: 'feedback', screen_path: '/comm/talk-to-vitana', app_version: '1.2.3' });
    expect(buildTalkTicketBody('hi', 'bug', null)).toEqual({ raw_text: 'hi', kind: 'bug', screen_path: '/comm/talk-to-vitana' });
  });

  it('a failed submit shows the web error toast and keeps the text', async () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: [] }, 'POST /feedback/tickets': status(500) });
    render(<TalkToVitanaScreen />, { wrapper });
    typeText('Something broke');
    fireEvent.press(screen.getByTestId('talk-send'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.community.couldnTSubmit'));
    expect(screen.getByTestId('talk-text').props.value).toBe('Something broke');
    expect(screen.queryByTestId('ticket-created')).toBeNull();
  });
});

describe('Your reports (MyTicketsList twin)', () => {
  it('loaded: count in the heading, number, status, badges, timeline, answer, confirm / reopen', async () => {
    const { wrapper, gateway } = makeWrapper({ [MINE]: { tickets: [resolved, fresh] }, 'POST /feedback/tickets/t-1/confirm': { ok: true } });
    render(<TalkToVitanaScreen />, { wrapper });
    expect(await screen.findByTestId('talk-ticket-t-1')).toBeTruthy();
    expect(screen.getByText('Your reports (2)')).toBeTruthy();
    expect(screen.getByText('FB-0001')).toBeTruthy();
    expect(screen.getByTestId('talk-ticket-answer-t-1')).toBeTruthy();
    expect(screen.getByText('We fixed the crash.')).toBeTruthy();
    expect(screen.getAllByTestId('talk-ticket-status-fixed').length).toBe(1);
    expect(screen.getAllByTestId('talk-ticket-status-received').length).toBe(1);
    fireEvent.press(screen.getByTestId('talk-ticket-confirm-t-1'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.community.thanks'));
    expect(gateway.writes().map((c) => `${c.method} ${c.path}`)).toEqual(['POST /feedback/tickets/t-1/confirm']);
  });

  it('empty', async () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: [] } });
    render(<TalkToVitanaScreen />, { wrapper });
    expect(await screen.findByTestId('talk-tickets-empty')).toBeTruthy();
    expect(screen.getByText('No tickets yet.')).toBeTruthy();
  });

  it('error, then retry loads', async () => {
    let fail = true;
    const { wrapper } = makeWrapper({ [MINE]: () => (fail ? status(500) : { tickets: [fresh] }) });
    render(<TalkToVitanaScreen />, { wrapper });
    expect(await screen.findByTestId('talk-tickets-error')).toBeTruthy();
    fail = false;
    fireEvent.press(screen.getByTestId('talk-tickets-retry'));
    expect(await screen.findByTestId('talk-ticket-t-2')).toBeTruthy();
  });
});

describe('?ticket= deep link', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...fresh, id: `t-${i + 10}`, ticket_number: `FB-${String(i + 10).padStart(4, '0')}` }));

  it.each([
    ['the ticket id', 't-21'],
    ['the FB-number, any case', 'fb-0021'],
  ])('opens on the right ticket by %s, beyond the first page', async (_label, ref) => {
    mockParams.current = { ticket: ref };
    const { wrapper } = makeWrapper({ [MINE]: { tickets: many } });
    render(<TalkToVitanaScreen />, { wrapper });
    const card = await screen.findByTestId('talk-ticket-t-21');
    expect(card.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('talk-ticket-t-10').props.accessibilityState).toBeUndefined();
    // 12 tickets, page of 10: the deep-linked 12th is shown, nothing after it is hidden.
    expect(screen.queryByTestId('talk-tickets-show-more')).toBeNull();
  });

  it('without ?ticket= only the first page shows', async () => {
    const { wrapper } = makeWrapper({ [MINE]: { tickets: many } });
    render(<TalkToVitanaScreen />, { wrapper });
    await screen.findByTestId('talk-ticket-t-10');
    expect(screen.queryByTestId('talk-ticket-t-21')).toBeNull();
    fireEvent.press(screen.getByTestId('talk-tickets-show-more'));
    expect(screen.getByTestId('talk-ticket-t-21')).toBeTruthy();
  });
});
