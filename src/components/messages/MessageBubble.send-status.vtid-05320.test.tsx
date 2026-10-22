/**
 * VTID-05320 (messenger-ux-v2/ui-send-status) — the status of my own message
 * is visible and spoken (Sending / Sent / Delivered / Read / Not sent), and a
 * failed message offers one-tap, keyboard-reachable Retry with its own id.
 * Also: GroupChat keeps unsent rows across a refetch (mergeGroupRows).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
}));

import MessageBubble from './MessageBubble';
import { mergeGroupRows } from '@/pages/messages/GroupChat';

const CID = '9a6b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';

function bubble(over: Record<string, unknown>, onRetry = vi.fn(), own = true) {
  render(
    <MemoryRouter>
      <MessageBubble
        message={{ id: 'srv-1', sender_id: own ? 'me' : 'peer', body: 'hello', content: 'hello', message_type: 'text', created_at: '2026-10-21T10:00:00Z', thread_id: 'peer', ...over } as never}
        isOwnMessage={own}
        onRetry={onRetry}
      />
    </MemoryRouter>,
  );
  return onRetry;
}

describe('MessageBubble send status (VTID-05320)', () => {
  it.each([
    [{ id: `temp-${CID}`, send_status: 'sending', client_message_id: CID }, 'sending'],
    [{}, 'sent'],
    [{ delivered_at: '2026-10-21T10:00:05Z' }, 'delivered'],
    [{ delivered_at: '2026-10-21T10:00:05Z', read_at: '2026-10-21T10:01:00Z' }, 'read'],
    [{ id: `temp-${CID}`, send_status: 'failed', client_message_id: CID }, 'failed'],
  ])('%o shows %s with a spoken label', (over, status) => {
    bubble(over);
    const icon = screen.getByTestId(`message-status-${status}`);
    expect(icon.getAttribute('aria-label')).toBe(`inbox.messageStatus.${status}`);
  });

  it('a failed message keeps its text and Retry passes its client_message_id', () => {
    const onRetry = bubble({ id: `temp-${CID}`, send_status: 'failed', client_message_id: CID });
    expect(screen.getByText('hello')).toBeTruthy();
    const retry = screen.getByTestId('message-retry');
    expect(retry.tagName).toBe('BUTTON'); // focusable, Enter/Space activate it
    expect(retry.getAttribute('aria-label')).toBe('inbox.messageStatus.retryLabel');
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledWith(CID);
  });

  it('no Retry row and no status on someone else\'s message', () => {
    bubble({ send_status: 'failed', client_message_id: CID }, vi.fn(), false);
    expect(screen.queryByTestId('message-retry')).toBeNull();
    expect(screen.queryByTestId('message-status-failed')).toBeNull();
  });
});

describe('GroupChat mergeGroupRows (VTID-05320)', () => {
  const row = (id: string, over: Record<string, unknown> = {}) =>
    ({ id, tenant_id: 't', sender_id: 'me', group_id: 'g', content: id, created_at: '2026-10-21T10:00:00Z', ...over }) as never;

  it('a refetch keeps unsent rows (sending / failed) and drops one whose id arrived', () => {
    const prev = [
      row('srv-1'),
      row(`temp-${CID}`, { send_status: 'failed', client_message_id: CID }),
      row('temp-x', { send_status: 'sending', client_message_id: 'x' }),
    ];
    const server = [row('srv-1'), row('srv-2', { client_message_id: 'x' })];
    const merged = mergeGroupRows(prev, server) as Array<{ id: string }>;
    expect(merged.map((m) => m.id)).toEqual(['srv-1', 'srv-2', `temp-${CID}`]);
  });

  it('a group message never shows Delivered or Read (no per-message receipts)', () => {
    bubble({ thread_id: 'g', read_at: null, delivered_at: null });
    expect(screen.getByTestId('message-status-sent')).toBeTruthy();
    expect(screen.queryByTestId('message-status-delivered')).toBeNull();
  });
});
