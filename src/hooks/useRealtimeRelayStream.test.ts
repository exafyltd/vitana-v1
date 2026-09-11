import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeRelayStream } from './useRealtimeRelayStream';
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

describe('useRealtimeRelayStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disabled — no fetch/consume attempt, status stays idle', () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const onRow = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeRelayStream({ path: 'user-activity-log/stream', eventName: 'user_activity', onRow, enabled: false }),
    );

    expect(result.current).toBe('idle');
    expect(consumeSseRelayMock).not.toHaveBeenCalled();
  });

  it('connects to the URL built from the given path, with the caller\'s bearer token', async () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const onRow = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeRelayStream({ path: 'chat-messages/stream', eventName: 'chat_message', onRow, enabled: true }),
    );

    await waitFor(() => expect(result.current).toBe('connected'));

    expect(consumeSseRelayMock).toHaveBeenCalledTimes(1);
    const [url, jwt, opts] = consumeSseRelayMock.mock.calls[0];
    expect(url).toContain('/api/v1/realtime/chat-messages/stream');
    expect(jwt).toBe('jwt-123');
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('only surfaces events matching the given eventName, ignoring other event types on the same stream', async () => {
    let capturedOnEvent: ((e: { event: string; data: string; id: string | null }) => void) | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedOnEvent = opts.onEvent;
      return new Promise(() => {});
    });

    const onRow = vi.fn();
    renderHook(() =>
      useRealtimeRelayStream({ path: 'user-activity-log/stream', eventName: 'user_activity', onRow, enabled: true }),
    );

    await waitFor(() => expect(capturedOnEvent).toBeDefined());

    capturedOnEvent!({ id: '1', event: 'connected', data: '{}' });
    expect(onRow).not.toHaveBeenCalled();

    const row = { id: 'a1', user_id: 'u1', created_at: '2026-01-01T00:00:00Z' };
    capturedOnEvent!({ id: 'a1', event: 'user_activity', data: JSON.stringify(row) });
    expect(onRow).toHaveBeenCalledWith(row);
  });

  it('aborts the in-flight stream on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedSignal = opts.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() =>
      useRealtimeRelayStream({ path: 'chat-messages/stream', eventName: 'chat_message', onRow: vi.fn(), enabled: true }),
    );
    await waitFor(() => expect(capturedSignal).toBeDefined());

    expect(capturedSignal!.aborted).toBe(false);
    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });
});
