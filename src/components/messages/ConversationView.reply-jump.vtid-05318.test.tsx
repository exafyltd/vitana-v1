/**
 * VTID-05318 (messenger-ux-v2/ui-reply-jump) — reply quotes in a DM:
 * a loaded original is jumped to; an original that is not loaded is fetched
 * (?around=) and the quote shows it; one that the conversation does not have
 * reads "original message not available"; tapping a quote whose original is
 * far back loads the window and jumps there.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

let threads: unknown[] = [];
let messages: unknown[] = [];
vi.mock('@/hooks/useHybridMessages', () => ({
  useHybridMessages: () => ({
    threads, messages, sendMessage: vi.fn(), markAsRead: vi.fn(), isSending: false, typingUsers: [],
    startTyping: vi.fn(), stopTyping: vi.fn(), fetchMessages: vi.fn(), context: 'global',
    isMessagesLoading: false, isMessagesFetching: false, loadOlderMessages: vi.fn(), hasOlderMessages: false, isLoadingOlder: false,
  }),
}));
const fetchConversationAround = vi.fn();
const fetchConversationAfter = vi.fn(async (..._a: unknown[]) => [] as unknown[]);
vi.mock('@/hooks/useChatApi', () => ({
  fetchConversationAround: (...a: unknown[]) => fetchConversationAround(...a),
  fetchConversationAfter: (...a: unknown[]) => fetchConversationAfter(...a),
}));
vi.mock('@/hooks/useCalendarEvents', () => ({
  useCalendarEvents: () => ({ respondToInvite: vi.fn(), getInviteResponse: vi.fn(), addEvent: vi.fn(), fetchEvents: vi.fn() }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/messageStatus', () => ({ autoMarkAsDelivered: vi.fn(), markMessagesAsRead: vi.fn() }));
const notifyError = vi.fn();
vi.mock('@/lib/i18n-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));
vi.mock('./MessageInput', () => ({ default: () => null }));
// The bubble stand-in exposes what ConversationView gives it.
vi.mock('./MessageBubble', () => ({
  default: (p: { message: { id: string; body: string; reply_to_message_id?: string }; parentMessage?: { body: string } | null; parentUnavailable?: boolean; onScrollToMessage?: (id: string) => void }) => (
    <div data-testid={`bubble-${p.message.id}`}>
      {p.message.body}
      {p.message.reply_to_message_id && (
        <button
          data-testid={`quote-${p.message.id}`}
          data-state={p.parentMessage ? 'loaded' : p.parentUnavailable ? 'unavailable' : 'loading'}
          onClick={() => p.onScrollToMessage?.(p.message.reply_to_message_id!)}
        >
          {p.parentMessage?.body ?? ''}
        </button>
      )}
    </div>
  ),
}));
vi.mock('./GroupMembersModal', () => ({ default: () => null }));
vi.mock('@/components/messages/CreateGroupPopup', () => ({ default: () => null }));
vi.mock('@/components/payment/PaymentMessageHandler', () => ({ PaymentMessageHandler: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));
function builder() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable query-builder stub
  const b: any = {
    select: vi.fn(() => b), eq: vi.fn(() => b), in: vi.fn(() => b), or: vi.fn(() => b),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
  };
  return b;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => builder()), rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })), removeChannel: vi.fn(),
  },
}));

import ConversationView from './ConversationView';

const NOW = Date.now();
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
const view = (id: string, minAgo: number, extra: Record<string, unknown> = {}) =>
  ({ id, thread_id: 'alice', sender_id: 'alice', body: id, message_type: 'text', created_at: iso(minAgo), updated_at: iso(minAgo), read_at: iso(0), ...extra });
const gw = (id: string, minAgo: number) =>
  ({ id, tenant_id: 't', sender_id: 'alice', receiver_id: 'me', content: id, created_at: iso(minAgo), read_at: iso(0), message_type: 'text', metadata: {} });

const scrollIntoView = vi.fn();
beforeEach(() => {
  threads = [{ id: 'alice', type: 'direct', created_by: 'alice', created_at: iso(500), updated_at: iso(1), unread_count: 0,
    participants: [{ user_id: 'me', role: 'member' }, { user_id: 'alice', display_name: 'Alice', role: 'member' }] }];
  Element.prototype.scrollIntoView = scrollIntoView;
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  class NoopObserver { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  scrollIntoView.mockClear();
  fetchConversationAround.mockReset();
  fetchConversationAfter.mockClear();
  notifyError.mockClear();
});

describe('reply quotes in a DM (VTID-05318)', () => {
  it('a loaded original: the quote shows it and a tap jumps there', async () => {
    messages = [view('parent', 10), view('answer', 5, { reply_to_message_id: 'parent' })];
    render(<ConversationView threadId="alice" context="global" />);
    const quote = screen.getByTestId('quote-answer');
    expect(quote.dataset.state).toBe('loaded');
    scrollIntoView.mockClear();
    await act(async () => { fireEvent.click(quote); });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(fetchConversationAround).not.toHaveBeenCalled();
  });

  it('an original that is not loaded is fetched once and shown in the quote', async () => {
    fetchConversationAround.mockImplementation(async (_p: string, id: string) => ({ data: [gw(id, 300)], has_older: true, has_newer: true }));
    messages = [view('answer', 5, { reply_to_message_id: 'old-parent' })];
    render(<ConversationView threadId="alice" context="global" />);
    await waitFor(() => expect(screen.getByTestId('quote-answer').dataset.state).toBe('loaded'));
    expect(screen.getByTestId('quote-answer').textContent).toBe('old-parent');
    expect(fetchConversationAround).toHaveBeenCalledWith('alice', 'old-parent', 2);
  });

  it('an original the conversation does not have reads "not available"; a tap shows a toast', async () => {
    fetchConversationAround.mockResolvedValue(null);
    messages = [view('answer', 5, { reply_to_message_id: 'gone' })];
    render(<ConversationView threadId="alice" context="global" />);
    await waitFor(() => expect(screen.getByTestId('quote-answer').dataset.state).toBe('unavailable'));
    scrollIntoView.mockClear();
    await act(async () => { fireEvent.click(screen.getByTestId('quote-answer')); });
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('inbox.reply.unavailable'));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('tapping the quote of a far-back original loads the window around it, connects it and jumps', async () => {
    // The quote's own lookup (limit 2) and the jump's window (limit 40).
    fetchConversationAround.mockImplementation(async (_p: string, id: string, limit: number) =>
      limit === 2 ? { data: [gw(id, 300)], has_older: true, has_newer: true }
        : { data: [gw('w1', 301), gw(id, 300), gw('w2', 299)], has_older: true, has_newer: true });
    fetchConversationAfter.mockResolvedValueOnce([gw('bridge', 100), gw('answer', 5)] as never);
    messages = [view('answer', 5, { reply_to_message_id: 'far' })];
    render(<ConversationView threadId="alice" context="global" />);
    await waitFor(() => expect(screen.getByTestId('quote-answer').dataset.state).toBe('loaded'));
    scrollIntoView.mockClear();
    await act(async () => { fireEvent.click(screen.getByTestId('quote-answer')); });
    await waitFor(() => expect(screen.getByTestId('bubble-far')).toBeTruthy());
    expect(screen.getByTestId('bubble-bridge')).toBeTruthy(); // no hole between the window and the page
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' }));
  });
});
