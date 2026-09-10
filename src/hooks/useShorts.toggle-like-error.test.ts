/**
 * useShorts.ts — useToggleLike() previously discarded the initial
 * likes_count read's `error`, only checking `if (video)`. On a real read
 * failure, `video` is `undefined`, the update branch is skipped entirely,
 * and the mutation resolves WITHOUT throwing — so the Like button click
 * silently did nothing: no toast, no error, the like count never changed,
 * and `onSuccess` still fired (invalidating the query for no reason).
 *
 * This pins that a real read error is now thrown (surfacing via the
 * mutation's own error state), while a successful read still updates the
 * count exactly as before.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

let selectResult: { data: unknown; error: unknown };
const updateMock = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));

function makeBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(selectResult)),
    update: (...args: unknown[]) => updateMock(...args),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => makeBuilder()) },
}));

import { useToggleLike } from '@/hooks/useShorts';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useToggleLike — likes_count read error handling', () => {
  beforeEach(() => {
    updateMock.mockClear();
  });

  it('surfaces a mutation error (not a silent no-op) when the initial read errors', async () => {
    selectResult = { data: null, error: { message: 'connection reset' } };
    const { result } = renderHook(() => useToggleLike(), { wrapper });

    result.current.mutate({ videoId: 'v1', action: 'like' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('updates the count as before on a successful read', async () => {
    selectResult = { data: { likes_count: 3 }, error: null };
    const { result } = renderHook(() => useToggleLike(), { wrapper });

    result.current.mutate({ videoId: 'v1', action: 'like' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith({ likes_count: 4 });
  });
});
