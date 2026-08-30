/**
 * useAppointmentNotifications.ts — confirmation/cancellation/reschedule
 * email dispatch via supabase.functions.invoke() previously never checked
 * the `error` field of the resolved result. invoke() resolves normally
 * with `{data, error}` on a non-2xx response from the edge function —
 * it does not throw — so a real edge-function failure (5xx, timeout, bad
 * payload) was swallowed with zero log, indistinguishable from success.
 *
 * This pins that each of the three email-dispatch call sites (confirmation,
 * cancellation, reschedule) now logs via console.error when `error` is
 * present in the resolved invoke() result, without changing any other
 * behavior (the toast still fires either way).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

let insertCallback: ((payload: any) => void | Promise<void>) | null = null;
let updateCallback: ((payload: any) => void | Promise<void>) | null = null;
const invokeMock = vi.fn();

function makeChannel() {
  const channel: any = {
    on: vi.fn((_event: string, filter: any, callback: any) => {
      if (filter.event === 'INSERT') insertCallback = callback;
      if (filter.event === 'UPDATE') updateCallback = callback;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  return channel;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
    channel: vi.fn(() => makeChannel()),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n-toast', () => ({ notify: vi.fn(), notifyError: vi.fn() }));

import { useAppointmentNotifications } from './useAppointmentNotifications';

describe('useAppointmentNotifications — functions.invoke error visibility', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    insertCallback = null;
    updateCallback = null;
    invokeMock.mockReset();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useAppointmentNotifications());
    // setupSubscription() is async (awaits auth.getUser() first) — flush microtasks.
    await Promise.resolve();
    await Promise.resolve();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs when the confirmation email invoke resolves with an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge function failed' } });
    expect(insertCallback).toBeTruthy();

    await insertCallback!({ new: { id: 'appt-1' } });

    expect(errorSpy).toHaveBeenCalledWith('Failed to send confirmation email:', expect.objectContaining({ message: 'edge function failed' }));
  });

  it('logs nothing on a successful confirmation email invoke', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });

    await insertCallback!({ new: { id: 'appt-1' } });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs when the cancellation email invoke resolves with an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge function failed' } });
    expect(updateCallback).toBeTruthy();

    await updateCallback!({
      old: { status: 'pending', start_time: '2026-01-01T10:00:00Z' },
      new: { id: 'appt-1', status: 'cancelled', start_time: '2026-01-01T10:00:00Z', metadata: {} },
    });

    expect(errorSpy).toHaveBeenCalledWith('Failed to send cancellation email:', expect.objectContaining({ message: 'edge function failed' }));
  });

  it('logs when the reschedule email invoke resolves with an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge function failed' } });

    await updateCallback!({
      old: { status: 'confirmed', start_time: '2026-01-01T10:00:00Z' },
      new: { id: 'appt-1', status: 'confirmed', start_time: '2026-01-02T10:00:00Z', metadata: {} },
    });

    expect(errorSpy).toHaveBeenCalledWith('Failed to send reschedule email:', expect.objectContaining({ message: 'edge function failed' }));
  });
});
