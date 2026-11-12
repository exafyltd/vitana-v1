/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox's
 * "Search messages" button + panel (web VTID-05317, Messages.tsx:506-527,
 * :1319, :1403; MessageSearchPanel scope "all"; review fix 1): shown in the
 * Community context only; the request is the web's `GET /chat/search` (q,
 * limit 20, type, local-day from / to, cursor) with the Bearer token; hint
 * under 3 characters; results with the conversation name and the marked
 * snippet; a hit opens the conversation at the message; "Show more" pages
 * with the cursor; error and empty states. The gateway is a fake.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { ANNA, FAIL, TOKEN, inboxWrapper, loadedRoutes, loadedTables } from './helpers';

afterEach(() => {
  router.navigate.mockClear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const hit = (id: string, key: string, snippet: string) => ({ message_id: id, conversation_key: key, sender_id: ANNA, created_at: '2026-10-30T09:15:00Z', snippet, message_type: 'text' });

async function openSearch(search: unknown) {
  const h = inboxWrapper({ ...loadedRoutes, 'GET /chat/search': search }, { tables: loadedTables });
  render(<InboxScreen />, { wrapper: h.wrapper });
  await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
  fireEvent.press(screen.getByTestId('inbox-message-search-button'));
  await waitFor(() => expect(screen.getByTestId('message-search-panel')).toBeTruthy());
  return h;
}

async function type(text: string) {
  fireEvent.changeText(screen.getByTestId('message-search-input'), text);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });
}

describe('inbox message search', () => {
  it('shows the button with its label in the Community context only', async () => {
    const h = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper: h.wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    expect(screen.getByTestId('inbox-message-search-button').props.accessibilityLabel).toBe('Search messages');
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-tenant'));
    await waitFor(() => expect(screen.queryByTestId('inbox-message-search-button')).toBeNull());
  });

  it('hints under 3 characters, then sends the web query and lists the hits with the conversation name', async () => {
    const { requests } = await openSearch({ ok: true, results: [hit('m-1', `dm:${ANNA}`, 'See you at Yoga tonight'), hit('m-2', 'group:g-1', 'yoga mats')], next_cursor: null });
    await type('yo');
    expect(screen.getByTestId('message-search-too-short')).toBeTruthy();
    expect(requests.some((r) => r.path === '/chat/search')).toBe(false);
    await type('yoga');
    await waitFor(() => expect(screen.getAllByTestId('message-search-result')).toHaveLength(2));
    const req = requests.find((r) => r.path === '/chat/search');
    expect(req?.method).toBe('GET');
    expect(req?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(Object.fromEntries(req!.query)).toEqual({ q: 'yoga', limit: '20' });
    const [first, second] = screen.getAllByTestId('message-search-result');
    expect(within(first).getByText('Anna Berg')).toBeTruthy();
    expect(within(first).getByText('Yoga')).toBeTruthy();
    expect(within(second).getByText('FIRST 100')).toBeTruthy();
  });

  it('a hit opens its conversation at the message and closes the panel', async () => {
    await openSearch({ ok: true, results: [hit('m-2', 'group:g-1', 'yoga mats')], next_cursor: null });
    await type('yoga');
    await waitFor(() => expect(screen.getByTestId('message-search-result')).toBeTruthy());
    fireEvent.press(screen.getByTestId('message-search-result'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox/g/g-1/msg/m-2');
  });

  it('applies the type filter and complete local days, and pages with the cursor', async () => {
    let page = 0;
    const { requests } = await openSearch(() => {
      page += 1;
      return page === 1 ? { ok: true, results: [], next_cursor: null } : page === 2 ? { ok: true, results: [hit('m-1', `dm:${ANNA}`, 'photo')], next_cursor: 'c-2' } : { ok: true, results: [hit('m-9', `dm:${ANNA}`, 'older photo')], next_cursor: null };
    });
    await type('photo');
    fireEvent.press(screen.getByTestId('message-search-type-image'));
    fireEvent.changeText(screen.getByTestId('message-search-from'), '2026-10-0');
    fireEvent.changeText(screen.getByTestId('message-search-from'), '2026-10-01');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    await waitFor(() => expect(screen.getAllByTestId('message-search-result')).toHaveLength(1));
    const last = requests.filter((r) => r.path === '/chat/search').at(-1)!;
    expect(last.query.get('type')).toBe('image');
    expect(last.query.get('from')).toBe(new Date('2026-10-01T00:00:00.000').toISOString());
    expect(last.query.has('to')).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-search-more'));
    });
    await waitFor(() => expect(screen.getAllByTestId('message-search-result')).toHaveLength(2));
    expect(requests.filter((r) => r.path === '/chat/search').at(-1)!.query.get('cursor')).toBe('c-2');
    expect(screen.queryByTestId('message-search-more')).toBeNull();
  });

  it('shows the empty and the error state', async () => {
    await openSearch({ ok: true, results: [], next_cursor: null });
    await type('nothing');
    await waitFor(() => expect(screen.getByTestId('message-search-empty')).toBeTruthy());
    expect(screen.getByText('No messages found')).toBeTruthy();
  });

  it('shows the error state when the gateway fails', async () => {
    await openSearch(FAIL);
    await type('broken');
    await waitFor(() => expect(screen.getByTestId('message-search-error')).toBeTruthy());
    expect(screen.getByText('Search failed. Please try again.')).toBeTruthy();
  });
});
