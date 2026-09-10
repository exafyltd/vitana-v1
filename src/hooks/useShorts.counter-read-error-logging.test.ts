/**
 * useShorts.ts — useTrackMediaEvent()/useIncrementViews() swallowed-error bug,
 * four call sites (likes/shares/views read-then-increment counters).
 *
 * Each of these vanity counters is bumped by reading the current count via
 * `.select('...count').single()` and then only checking `if (video)` before
 * `.update()`ing it — previously never checking `error`, so a real DB read
 * failure silently no-op'd the increment with nothing logged, indistinguishable
 * from any other reason the update might not have happened.
 *
 * These are vanity counters, not correctness-critical data, so the fix is
 * log-only: check the `error` from each `.single()` read and `console.error`
 * it, without changing the existing no-op-on-failure behavior.
 *
 * Verified here with a mocked Supabase client — both hooks are plain
 * exported `useMutation`-based hooks, testable via `renderHook` +
 * `mutateAsync` rather than needing a source-level check.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

let selectResult: { data: unknown; error: unknown };
const fromMock = vi.fn(() => makeBuilder(selectResult));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
  },
}));

import { useTrackMediaEvent, useIncrementViews } from '@/hooks/useShorts';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useShorts — counter read-error logging (log-only, no-op preserved)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('useTrackMediaEvent: logs on a likes_count read error and still resolves (no-op preserved)', async () => {
    selectResult = { data: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useTrackMediaEvent(), { wrapper });

    await result.current.mutateAsync({ mediaId: 'm1', mediaType: 'video', eventType: 'like' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('likes_count'),
      expect.objectContaining({ message: 'boom' }),
    );
  });

  it('useTrackMediaEvent: logs on a shares_count read error', async () => {
    selectResult = { data: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useTrackMediaEvent(), { wrapper });

    await result.current.mutateAsync({ mediaId: 'm1', mediaType: 'video', eventType: 'share' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('shares_count'),
      expect.objectContaining({ message: 'boom' }),
    );
  });

  it('useTrackMediaEvent: logs on a views_count read error (play_start)', async () => {
    selectResult = { data: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useTrackMediaEvent(), { wrapper });

    await result.current.mutateAsync({ mediaId: 'm1', mediaType: 'video', eventType: 'play_start' });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('views_count'),
      expect.objectContaining({ message: 'boom' }),
    );
  });

  it('useTrackMediaEvent: does NOT log for an event type with no counter read (play_25)', async () => {
    selectResult = { data: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useTrackMediaEvent(), { wrapper });

    await result.current.mutateAsync({ mediaId: 'm1', mediaType: 'video', eventType: 'play_25' });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('useIncrementViews: logs on a views_count read error and still resolves (no-op preserved)', async () => {
    selectResult = { data: null, error: { message: 'boom' } };
    const { result } = renderHook(() => useIncrementViews(), { wrapper });

    await result.current.mutateAsync('video-1');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('views_count'),
      expect.objectContaining({ message: 'boom' }),
    );
  });

  it('does not log anything when the read succeeds', async () => {
    selectResult = { data: { likes_count: 3 }, error: null };
    const { result } = renderHook(() => useTrackMediaEvent(), { wrapper });

    await result.current.mutateAsync({ mediaId: 'm1', mediaType: 'video', eventType: 'like' });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
