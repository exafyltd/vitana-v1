/**
 * VTID-05201 (chat-ux) — landing on a deep-linked message (notification tap)
 * jumps there instantly instead of gliding.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('./MessageInput', () => ({ default: () => null }));
vi.mock('./MessageBubble', () => ({ default: () => null }));
vi.mock('./GroupMembersModal', () => ({ default: () => null }));
vi.mock('@/components/messages/CreateGroupPopup', () => ({ default: () => null }));
vi.mock('@/components/payment/PaymentMessageHandler', () => ({ PaymentMessageHandler: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));

function builder() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable query-builder stub
  const b: any = {
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    in: vi.fn(() => b),
    or: vi.fn(() => b),
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


import ConversationView from './ConversationView';

describe('ConversationView — deep-link scroll (VTID-05201)', () => {
  it('scrolls the target message into view without smooth animation', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    threads = [
      {
        id: 'alice', type: 'direct', created_by: 'alice',
        created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z', unread_count: 0,
        participants: [{ user_id: 'me', role: 'member' }, { user_id: 'alice', display_name: 'Alice', role: 'member' }],
      },
    ];
    messages = [
      { id: 'm1', thread_id: 'alice', sender_id: 'alice', receiver_id: 'me', content: 'hi', created_at: '2026-10-15T00:00:00Z' },
    ];
    render(<ConversationView threadId="alice" context="global" initialScrollMessageId="m1" />);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });
});
