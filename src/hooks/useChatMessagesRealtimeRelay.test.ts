import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatMessagesRealtimeRelay } from './useChatMessagesRealtimeRelay';
import { consumeSseRelay } from '@/lib/sse-relay-client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'jwt-123' } } }),
    },
  },
}));

vi.mock('@/lib/sse-relay-client', () => ({
  consumeSseRelay: vi.fn(),
}));

const consumeSseRelayMock = vi.mocked(consumeSseRelay);

describe('useChatMessagesRealtimeRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disabled', () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useChatMessagesRealtimeRelay({ onMessage: vi.fn(), enabled: false }));
    expect(result.current).toBe('idle');
    expect(consumeSseRelayMock).not.toHaveBeenCalled();
  });

  it('connects to the chat-messages relay URL with the caller\'s bearer token', async () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useChatMessagesRealtimeRelay({ onMessage: vi.fn(), enabled: true }));

    await waitFor(() => expect(result.current).toBe('connected'));

    const [url, jwt] = consumeSseRelayMock.mock.calls[0];
    expect(url).toContain('/api/v1/realtime/chat-messages/stream');
    expect(jwt).toBe('jwt-123');
  });

  it('invokes onMessage with the parsed ChatMessage for a chat_message event, ignoring other event types', async () => {
    let capturedOnEvent: ((e: { event: string; data: string; id: string | null }) => void) | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedOnEvent = opts.onEvent;
      return new Promise(() => {});
    });

    const onMessage = vi.fn();
    renderHook(() => useChatMessagesRealtimeRelay({ onMessage, enabled: true }));
    await waitFor(() => expect(capturedOnEvent).toBeDefined());

    capturedOnEvent!({ id: '1', event: 'connected', data: '{}' });
    expect(onMessage).not.toHaveBeenCalled();

    const message = {
      id: 'm1',
      tenant_id: 't1',
      sender_id: 'u1',
      receiver_id: 'u2',
      content: 'hi',
      read_at: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    capturedOnEvent!({ id: 'm1', event: 'chat_message', data: JSON.stringify(message) });
    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it('aborts the in-flight stream on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedSignal = opts.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useChatMessagesRealtimeRelay({ onMessage: vi.fn(), enabled: true }));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    expect(capturedSignal!.aborted).toBe(false);
    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });
});
