/**
 * VTID-05314 (messenger-ux-v2/ui-compact-grouping) — the DM view passes each
 * bubble its group position, the unread divider starts a new group, and the
 * small gap sits INSIDE a group (after its first/middle bubbles).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

let threads: unknown[] = [];
let messages: unknown[] = [];
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
    isMessagesFetching: false,
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
vi.mock('./MessageBubble', () => ({
  default: (p: { message: { id: string; body: string }; groupPosition?: string }) => (
    <div data-testid={`bubble-${p.message.id}`} data-pos={p.groupPosition ?? ''}>{p.message.body}</div>
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
    from: vi.fn(() => builder()),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

import ConversationView from './ConversationView';

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  Element.prototype.scrollIntoView = vi.fn();
  class NoopObserver { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

const at = (min: number) => new Date(2026, 9, 21, 10, min).toISOString();
const msg = (id: string, sender: string, min: number, read_at: string | null = at(59)) =>
  ({ id, thread_id: 'alice', sender_id: sender, body: id, message_type: 'text', created_at: at(min), updated_at: at(min), read_at });
const pos = (id: string) => screen.getByTestId(`bubble-${id}`).dataset.pos;
const gap = (id: string) => document.getElementById(`msg-${id}`)!.className;

describe('ConversationView grouping (VTID-05314)', () => {
  it('positions per sender run; the unread divider splits a run; 2 px inside a group, 6 px after it', () => {
    threads = [{
      id: 'alice', type: 'direct', created_by: 'alice', created_at: at(0), updated_at: at(9), unread_count: 0,
      participants: [{ user_id: 'me', role: 'member' }, { user_id: 'alice', display_name: 'Alice', role: 'member' }],
    }];
    messages = [
      msg('a1', 'alice', 1), msg('a2', 'alice', 2),
      msg('m1', 'me', 3),
      msg('a3', 'alice', 4), msg('u1', 'alice', 5, null), msg('u2', 'alice', 6, null),
    ];
    render(<ConversationView threadId="alice" context="global" />);
    expect(['a1', 'a2', 'm1', 'a3', 'u1', 'u2'].map(pos)).toEqual(['first', 'last', 'single', 'single', 'first', 'last']);
    expect(screen.getByTestId('unread-divider').id).toBe('unread-divider-u1');
    expect(gap('a1')).toContain('mb-0.5');
    expect(gap('a2')).toContain('mb-1.5');
    expect(gap('m1')).toContain('mb-1.5');
    expect(gap('u1')).toContain('mb-0.5');
  });
});
