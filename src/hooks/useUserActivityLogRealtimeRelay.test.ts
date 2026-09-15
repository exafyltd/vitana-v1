import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserActivityLogRealtimeRelay } from './useUserActivityLogRealtimeRelay';
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

describe('useUserActivityLogRealtimeRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disabled', () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUserActivityLogRealtimeRelay({ onRow: vi.fn(), enabled: false }));
    expect(result.current).toBe('idle');
    expect(consumeSseRelayMock).not.toHaveBeenCalled();
  });

  it('connects to the user-activity-log relay URL with the caller\'s bearer token', async () => {
    consumeSseRelayMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUserActivityLogRealtimeRelay({ onRow: vi.fn(), enabled: true }));

    await waitFor(() => expect(result.current).toBe('connected'));

    const [url, jwt] = consumeSseRelayMock.mock.calls[0];
    expect(url).toContain('/api/v1/realtime/user-activity-log/stream');
    expect(jwt).toBe('jwt-123');
  });

  it('invokes onRow with the parsed row for a user_activity event, ignoring other event types', async () => {
    let capturedOnEvent: ((e: { event: string; data: string; id: string | null }) => void) | undefined;
    consumeSseRelayMock.mockImplementation((_url, _jwt, opts) => {
      capturedOnEvent = opts.onEvent;
      return new Promise(() => {});
    });

    const onRow = vi.fn();
    renderHook(() => useUserActivityLogRealtimeRelay({ onRow, enabled: true }));
    await waitFor(() => expect(capturedOnEvent).toBeDefined());

    capturedOnEvent!({ id: '1', event: 'connected', data: '{}' });
    expect(onRow).not.toHaveBeenCalled();

    const row = { id: 'a1', user_id: 'u1', created_at: '2026-01-01T00:00:00Z', activity_type: 'chat.message' };
    capturedOnEvent!({ id: 'a1', event: 'user_activity', data: JSON.stringify(row) });
    expect(onRow).toHaveBeenCalledWith(row);
  });
});
