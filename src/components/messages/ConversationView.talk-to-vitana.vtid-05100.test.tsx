/**
 * VTID-05100 (Companion Messages, Phase 2) — the "Talk to Vitana" voice
 * button appears in the conversation header only in the Vitana thread, and
 * it opens the ORB through activateOrb().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VITANA_BOT_USER_ID } from '@/lib/vitanaBotIdentity';

const activateOrb = vi.fn(() => true);
vi.mock('@/lib/orbActivate', () => ({ activateOrb: (...a: unknown[]) => activateOrb(...(a as [])) }));

let threads: unknown[] = [];
vi.mock('@/hooks/useHybridMessages', () => ({
  useHybridMessages: () => ({
    threads,
    messages: [],
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

function directThread(peer: string) {
  return {
    id: peer,
    type: 'direct',
    created_by: peer,
    created_at: '2026-10-13T00:00:00Z',
    updated_at: '2026-10-13T00:00:00Z',
    unread_count: 0,
    participants: [
      { user_id: 'me', role: 'member' },
      { user_id: peer, display_name: 'Peer', role: 'member' },
    ],
  };
}

beforeEach(() => activateOrb.mockClear());

describe('ConversationView — Talk to Vitana (VTID-05100)', () => {
  it('shows the voice button in the Vitana thread and it opens the ORB', () => {
    threads = [directThread(VITANA_BOT_USER_ID)];
    render(<ConversationView threadId={VITANA_BOT_USER_ID} context="global" />);
    const button = screen.getByTestId('talk-to-vitana-button');
    expect(button).toHaveAttribute('aria-label', 'screens.messages.talkToVitana');
    fireEvent.click(button);
    expect(activateOrb).toHaveBeenCalledTimes(1);
  });

  it('does not show the voice button in a conversation with another member', () => {
    threads = [directThread('alice')];
    render(<ConversationView threadId="alice" context="global" />);
    expect(screen.queryByTestId('talk-to-vitana-button')).toBeNull();
  });

  it('does not show the voice button in a group conversation', () => {
    threads = [{ ...directThread('grp-1'), type: 'group', participants: [{ user_id: 'me', role: 'member' }, { user_id: VITANA_BOT_USER_ID, role: 'member' }] }];
    render(<ConversationView threadId="grp-1" context="global" />);
    expect(screen.queryByTestId('talk-to-vitana-button')).toBeNull();
  });
});
