/**
 * VTID-05143 review finding (PR #1366, P1): publishing a post completes the E3
 * "First post" card, so a successful createPost re-reads the member's
 * enrichment cards — whichever composer (desktop popup, mobile sheet) posted.
 * Supabase is mocked: no real write happens.
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const insertError: { error: unknown } = { error: null };
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: async () => insertError,
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

import { useProfilePosts } from './useProfilePosts';
import { enrichmentCardsKey } from './useEnrichmentCards';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const W = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children);
  const { result } = renderHook(() => useProfilePosts(), { wrapper: W });
  return { result, invalidate };
}

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map(([filters]) => JSON.stringify((filters as { queryKey?: unknown })?.queryKey));

describe('useProfilePosts.createPost — enrichment cards', () => {
  it('a published post re-reads the enrichment cards (E3 "First post" goes away)', async () => {
    insertError.error = null;
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.createPost.mutateAsync({ content: 'hallo' });
    });
    expect(invalidatedKeys(invalidate)).toContain(JSON.stringify(enrichmentCardsKey('user-1')));
  });

  it('a failed post leaves the cards alone', async () => {
    insertError.error = { message: 'rls' };
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.createPost.mutateAsync({ content: 'hallo' }).catch(() => {});
    });
    expect(invalidatedKeys(invalidate)).not.toContain(JSON.stringify(enrichmentCardsKey('user-1')));
  });
});
