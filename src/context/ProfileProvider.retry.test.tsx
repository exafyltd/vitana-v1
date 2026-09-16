/**
 * VTID-03978 — ProfileProvider must recover from a failed `profiles` fetch.
 *
 * Reported live (2026-09-16, MAXINA mobile, production): under database
 * load the login-time profiles fetch timed out once, and for the rest of the
 * session the app showed the email-prefix name, "Exafy Admin" instead of the
 * @handle in the side drawer (the drawer falls back to the role label when
 * there is no handle), and the auth UUID as the handle on the identity card.
 * Nothing ever re-fetched: the realtime subscription only fires when the row
 * changes and the effect is keyed on user.id on purpose (VTID-03952).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: vi.fn(),
  },
}));

const USER = { id: 'c7d3260d-8311-4a0b-ab1c-53928a37caec', email: 'tadicjovana276@gmail.com' };
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ user: USER, session: { access_token: 'token' } }),
}));

import { ProfileProvider, useProfile, PROFILE_FETCH_RETRY_DELAYS_MS } from './ProfileProvider';

const REAL_ROW = {
  user_id: USER.id,
  display_name: 'Jovana Tadić',
  full_name: 'Jovana Tadic',
  first_name: 'Jovana',
  last_name: 'Tadić',
  handle: 'jovana4',
  vitana_id: 'jovana4',
  email: USER.email,
};

/** Mimics `.from('profiles').select('*').eq(...).maybeSingle().abortSignal(...)`. */
function queryResolvingTo(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => chain;
  chain.abortSignal = () => Promise.resolve(result);
  return chain;
}

function Probe() {
  const { profile, refreshProfile } = useProfile();
  return (
    <div>
      <div data-testid="state">
        {profile.displayName}|{profile.handle ?? '-'}|{profile.degraded ? 'degraded' : 'ok'}
      </div>
      <button type="button" onClick={refreshProfile}>refresh</button>
    </div>
  );
}

const flush = () => act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });

beforeEach(() => {
  fromMock.mockReset();
  vi.useFakeTimers();
  if (typeof (AbortSignal as unknown as { timeout?: unknown }).timeout !== 'function') {
    (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal;
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ProfileProvider — profile fetch retry (VTID-03978)', () => {
  it('shows the fallback after a failed first fetch, then restores the real profile on retry', async () => {
    fromMock
      .mockReturnValueOnce(queryResolvingTo({ data: null, error: { message: 'canceling statement due to statement timeout' } }))
      .mockReturnValueOnce(queryResolvingTo({ data: REAL_ROW, error: null }));

    render(<ProfileProvider><Probe /></ProfileProvider>);
    await flush();

    // The exact degraded state members saw: email prefix, no handle.
    expect(screen.getByTestId('state').textContent).toBe('tadicjovana276|-|degraded');
    expect(fromMock).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(PROFILE_FETCH_RETRY_DELAYS_MS[0]); });
    await flush();

    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('state').textContent).toBe('Jovana Tadić|jovana4|ok');
  });

  it('never replaces an already-loaded real profile with the fallback when a later refetch fails', async () => {
    fromMock
      .mockReturnValueOnce(queryResolvingTo({ data: REAL_ROW, error: null }))
      .mockReturnValue(queryResolvingTo({ data: null, error: { message: 'network error' } }));

    render(<ProfileProvider><Probe /></ProfileProvider>);
    await flush();
    expect(screen.getByTestId('state').textContent).toBe('Jovana Tadić|jovana4|ok');

    await act(async () => { screen.getByText('refresh').click(); });
    await flush();

    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('state').textContent).toBe('Jovana Tadić|jovana4|ok');
  });

  it('retries with backoff and stops after the configured number of attempts', async () => {
    fromMock.mockReturnValue(queryResolvingTo({ data: null, error: { message: 'timeout' } }));

    render(<ProfileProvider><Probe /></ProfileProvider>);
    await flush();
    expect(fromMock).toHaveBeenCalledTimes(1);

    for (let i = 0; i < PROFILE_FETCH_RETRY_DELAYS_MS.length; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(PROFILE_FETCH_RETRY_DELAYS_MS[i]); });
      await flush();
      expect(fromMock).toHaveBeenCalledTimes(i + 2);
    }

    // No further attempts once the schedule is exhausted.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await flush();
    expect(fromMock).toHaveBeenCalledTimes(PROFILE_FETCH_RETRY_DELAYS_MS.length + 1);
    expect(screen.getByTestId('state').textContent).toBe('tadicjovana276|-|degraded');
  });

  it('does not treat a missing profiles row (new user) as a failure: no retry, not degraded', async () => {
    fromMock.mockReturnValue(queryResolvingTo({ data: null, error: null }));

    render(<ProfileProvider><Probe /></ProfileProvider>);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await flush();

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('state').textContent).toBe('tadicjovana276|-|ok');
  });
});
