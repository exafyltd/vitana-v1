import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserNotificationsRealtimeRelay } from './useUserNotificationsRealtimeRelay';
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

describe('useUserNotificationsRealtimeRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disabled — no fetch/consume attempt, status stays idle', () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {})); // never resolves
    const onNotification = vi.fn();
    const { result } = renderHook(() => useUserNotificationsRealtimeRelay({ onNotification, enabled: false }));

    expect(result.current).toBe('idle');
    expect(consumeSseRelayMock).not.toHaveBeenCalled();
  });

  it('connects with the caller\'s bearer token and the correct relay URL when enabled', async () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {})); // stays open
    const onNotification = vi.fn();
    const { result } = renderHook(() => useUserNotificationsRealtimeRelay({ onNotification, enabled: true }));

    await waitFor(() => expect(result.current).toBe('connected'));

    expect(consumeSseRelayMock).toHaveBeenCalledTimes(1);
    const [url, jwt, opts] = consumeSseRelayMock.mock.calls[0];
    expect(url).toContain('/api/v1/realtime/user-notifications/stream');
    expect(jwt).toBe('jwt-123');
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('invokes onNotification with the parsed payload for a user_notification event, and ignores other event types', async () => {
    let capturedOnEvent: ((e: { event: string; data: string; id: string | null }) => void) | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedOnEvent = opts.onEvent;
      return new Promise(() => {});
    });

    const onNotification = vi.fn();
    renderHook(() => useUserNotificationsRealtimeRelay({ onNotification, enabled: true }));

    await waitFor(() => expect(capturedOnEvent).toBeDefined());

    capturedOnEvent!({ id: '1', event: 'connected', data: '{}' });
    expect(onNotification).not.toHaveBeenCalled();

    const notification = { id: 'n1', user_id: 'u1', tenant_id: 't1', type: 'x', title: 'T', body: null, data: {}, read_at: null, created_at: '2026-01-01T00:00:00Z' };
    capturedOnEvent!({ id: 'n1', event: 'user_notification', data: JSON.stringify(notification) });
    expect(onNotification).toHaveBeenCalledWith(notification);
  });

  it('aborts the in-flight stream on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedSignal = opts.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useUserNotificationsRealtimeRelay({ onNotification: vi.fn(), enabled: true }));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    expect(capturedSignal!.aborted).toBe(false);
    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });
});
