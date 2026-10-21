/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — opening a conversation.
 *
 * Acceptance (owner R8): "Opening a conversation must display the newest
 * message on the first visible frame, without an observable scroll-to-bottom
 * animation or jump." Pinned here as: the list is invisible until its position
 * is set, the position is set before paint (layout effect), no smooth scroll and
 * no timed retries are involved. Plus the unread divider (R8) and the "↓ N new
 * messages" pill without forced scrolling (R9).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';

let threads: unknown[] = [];
let messages: unknown[] = [];
let fetching = false;
vi.mock('@/hooks/useHybridMessages', () => ({
  useHybridMessages: () => ({
    threads,
    messages,
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    isSending: false,
    typingUsers: [],
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    fetchMessages: vi.fn(),
    context: 'global',
    isMessagesLoading: false,
    isMessagesFetching: fetching,
    loadOlderMessages: vi.fn(),
    hasOlderMessages: false,
    isLoadingOlder: false,
  }),
}));
vi.mock('@/hooks/useCalendarEvents', () => ({
  useCalendarEvents: () => ({ respondToInvite: vi.fn(), getInviteResponse: vi.fn(), addEvent: vi.fn(), fetchEvents: vi.fn() }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/messageStatus', () => ({ autoMarkAsDelivered: vi.fn(), markMessagesAsRead: vi.fn() }));
vi.mock('@/lib/i18n-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('./MessageInput', () => ({ default: () => null }));
vi.mock('./MessageBubble', () => ({ default: (p: { message: { body: string } }) => <div className="bubble">{p.message.body}</div> }));
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
    from: vi.fn(() => builder()),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

import ConversationView from './ConversationView';

// jsdom has no layout: give every element a 2000px-tall content in a 500px box.
const SCROLL_H = 2000;
const CLIENT_H = 500;
let positionsSeenBeforePaint: Array<{ visibility: string; scrollTop: number }> = [];
const scrollToSpy = vi.fn();

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => SCROLL_H });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => CLIENT_H });
  Element.prototype.scrollTo = scrollToSpy as unknown as typeof Element.prototype.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  class NoopObserver { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
  scrollToSpy.mockClear();
  fetching = false;
  positionsSeenBeforePaint = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
});
afterEach(() => {
  vi.useRealTimers();
});

const NOW = Date.now();
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
function thread() {
  return [{
    id: 'alice', type: 'direct', created_by: 'alice', created_at: iso(100), updated_at: iso(1), unread_count: 0,
    participants: [{ user_id: 'me', role: 'member' }, { user_id: 'alice', display_name: 'Alice', role: 'member' }],
  }];
}
function msg(id: string, sender: string, minAgo: number, read_at: string | null = iso(0)) {
  return { id, thread_id: 'alice', sender_id: sender, body: id, message_type: 'text', created_at: iso(minAgo), updated_at: iso(minAgo), read_at };
}
function scroller() {
  return document.getElementById('chat-scroll') as HTMLDivElement;
}

describe('ConversationView opening position (VTID-05319, R8)', () => {
  it('the first visible frame already shows the newest message: hidden until positioned, positioned before paint, no smooth scroll, no timers', () => {
    threads = thread();
    messages = Array.from({ length: 30 }, (_, i) => msg(`m${i}`, i % 2 ? 'alice' : 'me', 60 - i));
    // Observe what the DOM looks like at the end of the commit (layout effects
    // done) — that is what the browser paints first.
    const Probe = () => {
      React.useLayoutEffect(() => {
        const el = scroller();
        if (el) positionsSeenBeforePaint.push({ visibility: el.style.visibility, scrollTop: el.scrollTop });
      });
      return null;
    };
    render(<><ConversationView threadId="alice" context="global" /><Probe /></>);
    const el = scroller();
    // The first commit renders the list hidden, and already at the newest
    // message by the end of its layout effects ...
    expect(positionsSeenBeforePaint[0]).toEqual({ visibility: 'hidden', scrollTop: SCROLL_H - CLIENT_H });
    // ... and the positioning layout effect + its synchronous re-render finish
    // inside the same render() call, i.e. before the browser paints: the first
    // painted state is visible AND at the newest message.
    expect(el.dataset.positioned).toBe('true');
    expect(el.style.visibility).toBe('');
    expect(el.scrollTop).toBe(SCROLL_H - CLIENT_H);
    expect(scrollToSpy).not.toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    // No timed retries: from here on nothing writes the scroll position —
    // neither timers nor animation frames (the old 50/150/300 ms retries did
    // setTimeout → requestAnimationFrame → scrollTop write).
    let writes = 0;
    let value = el.scrollTop;
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => value,
      set: (v: number) => { writes += 1; value = v; },
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(writes).toBe(0);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('opens at the unread divider when the peer sent messages I have not read', () => {
    threads = thread();
    messages = [msg('m1', 'alice', 10), msg('m2', 'me', 9), msg('u1', 'alice', 5, null), msg('u2', 'alice', 4, null)];
    render(<ConversationView threadId="alice" context="global" />);
    const divider = screen.getByTestId('unread-divider');
    expect(divider.id).toBe('unread-divider-u1');
    expect(divider.textContent).toContain('inbox.newMessages.unread');
    // The divider (not the bottom) is where the conversation opens.
    expect(scroller().scrollTop).not.toBe(SCROLL_H - CLIENT_H);
  });

  it('a deep-linked message wins over the bottom and the divider', () => {
    threads = thread();
    messages = [msg('m1', 'alice', 10), msg('target', 'alice', 9), msg('u1', 'alice', 5, null)];
    render(<ConversationView threadId="alice" context="global" initialScrollMessageId="target" />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(screen.queryByTestId('unread-divider')).toBeNull();
  });
});

describe('ConversationView new messages without forced scrolling (VTID-05319, R9)', () => {
  it('reading earlier messages: a new message shows "↓ 1 new message" and the view stays; the pill goes to the newest', () => {
    threads = thread();
    messages = Array.from({ length: 20 }, (_, i) => msg(`m${i}`, 'alice', 40 - i));
    const view = render(<ConversationView threadId="alice" context="global" />);
    const el = scroller();
    // The member scrolls up.
    el.scrollTop = 200;
    act(() => { fireEvent.scroll(el); });
    act(() => { vi.advanceTimersByTime(20); }); // the scroll handler measures in an animation frame
    act(() => { vi.useRealTimers(); });
    return new Promise<void>((resolve) => requestAnimationFrame(() => {
      messages = [...messages, msg('new1', 'alice', 0)];
      view.rerender(<ConversationView threadId="alice" context="global" />);
      expect(el.scrollTop).toBe(200);
      const pill = screen.getByTestId('new-messages-pill');
      expect(pill.textContent).toContain('inbox.newMessages.one');
      fireEvent.click(pill);
      expect(el.scrollTop).toBe(SCROLL_H - CLIENT_H);
      expect(screen.queryByTestId('new-messages-pill')).toBeNull();
      resolve();
    }));
  });

  it('at the bottom a new message keeps the newest in view and shows no pill', () => {
    threads = thread();
    messages = Array.from({ length: 5 }, (_, i) => msg(`m${i}`, 'alice', 10 - i));
    const view = render(<ConversationView threadId="alice" context="global" />);
    const el = scroller();
    el.scrollTop = 0; // simulate the list having grown since
    messages = [...messages, msg('new1', 'alice', 0)];
    view.rerender(<ConversationView threadId="alice" context="global" />);
    expect(el.scrollTop).toBe(SCROLL_H - CLIENT_H);
    expect(screen.queryByTestId('new-messages-pill')).toBeNull();
  });
});

describe('ConversationView switching conversations (VTID-05319 review fixes)', () => {
  function bob() {
    return {
      id: 'bob', type: 'direct', created_by: 'bob', created_at: iso(100), updated_at: iso(1), unread_count: 0,
      participants: [{ user_id: 'me', role: 'member' }, { user_id: 'bob', display_name: 'Bob', role: 'member' }],
    };
  }
  const bobMsg = (id: string, minAgo: number, read_at: string | null = iso(0)) =>
    ({ ...msg(id, 'bob', minAgo, read_at), thread_id: 'bob' });

  it('A → B → A: coming back with new unread messages opens at the divider again', () => {
    threads = [...thread(), bob()];
    messages = [msg('m1', 'alice', 10), msg('u1', 'alice', 5, null)];
    const view = render(<ConversationView threadId="alice" context="global" />);
    expect(screen.getByTestId('unread-divider').id).toBe('unread-divider-u1');

    messages = [bobMsg('b1', 3)];
    view.rerender(<ConversationView threadId="bob" context="global" />);
    expect(screen.queryByTestId('unread-divider')).toBeNull();

    messages = [msg('m1', 'alice', 10), msg('u1', 'alice', 5), msg('u2', 'alice', 1, null)];
    view.rerender(<ConversationView threadId="alice" context="global" />);
    expect(screen.getByTestId('unread-divider').id).toBe('unread-divider-u2');
    expect(scroller().scrollTop).not.toBe(SCROLL_H - CLIENT_H);
  });

  it("the previous DM's rows (query placeholder) never decide the new DM's position or divider", () => {
    threads = [...thread(), bob()];
    messages = [msg('m1', 'alice', 10)];
    const view = render(<ConversationView threadId="alice" context="global" />);
    // Switch to Bob: for a moment the query still serves Alice's rows (fetching).
    fetching = true;
    view.rerender(<ConversationView threadId="bob" context="global" />);
    expect(scroller().dataset.positioned).toBe('false');
    // Bob's own rows arrive, with an unread one.
    fetching = false;
    messages = [bobMsg('b1', 5), bobMsg('b2', 2, null)];
    view.rerender(<ConversationView threadId="bob" context="global" />);
    expect(scroller().dataset.positioned).toBe('true');
    expect(screen.getByTestId('unread-divider').id).toBe('unread-divider-b2');
  });

  it('a legacy direct thread whose rows carry another thread_id is shown once fetching settled (never hidden forever)', () => {
    threads = [...thread(), bob()];
    fetching = false;
    messages = [{ ...bobMsg('l1', 5), thread_id: '99999999-9999-4999-8999-999999999999' }];
    render(<ConversationView threadId="bob" context="global" />);
    expect(scroller().dataset.positioned).toBe('true');
    expect(scroller().style.visibility).toBe('');
  });

  it('A (unread) → empty B → A: the old divider of the first visit is never used', () => {
    threads = [...thread(), bob()];
    fetching = false;
    messages = [msg('m1', 'alice', 10), msg('u1', 'alice', 5, null)];
    const view = render(<ConversationView threadId="alice" context="global" />);
    expect(screen.getByTestId('unread-divider').id).toBe('unread-divider-u1');
    messages = [];
    view.rerender(<ConversationView threadId="bob" context="global" />);
    messages = [msg('m1', 'alice', 10), msg('u1', 'alice', 5), msg('m2', 'me', 2)];
    view.rerender(<ConversationView threadId="alice" context="global" />);
    expect(screen.queryByTestId('unread-divider')).toBeNull();
    expect(scroller().scrollTop).toBe(SCROLL_H - CLIENT_H);
  });
});

describe('NewMessagesPill accessibility (VTID-05319 review fixes)', () => {
  it('the count is announced from an always-mounted status region, and focus stays in the chat after the jump', async () => {
    const { default: NewMessagesPill } = await import('./NewMessagesPill');
    const target = document.createElement('div');
    target.tabIndex = -1;
    document.body.appendChild(target);
    const onClick = vi.fn();
    const view = render(<NewMessagesPill count={0} onClick={onClick} focusAfterJump={() => target} />);
    const status = screen.getByTestId('new-messages-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('');
    view.rerender(<NewMessagesPill count={2} onClick={onClick} focusAfterJump={() => target} />);
    expect(screen.getByTestId('new-messages-status')).toBe(status); // same node: the change is announced
    expect(status.textContent).toContain('inbox.newMessages.other');
    fireEvent.click(screen.getByTestId('new-messages-pill'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(target);
    target.remove();
  });
});

