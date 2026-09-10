/**
 * useCampaignActions.ts — activateAllPosts() flips posts to "published"
 * then calls the distribute-post edge function for each, but never
 * checked each invoke() result's `error` field — Promise.all only rejects
 * on a network-level throw, not on `{error}` in a resolved value. If
 * distribution failed for some/all posts, the business/reseller user was
 * told "Campaign activated! N posts distributed" when it silently wasn't.
 *
 * This pins that a partial/total distribution failure is now logged and
 * surfaced as an error toast instead of a flat success claim, while a
 * fully successful run is unchanged.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

const invokeMock = vi.fn();
let draftPosts: Array<{ id: string }> = [{ id: 'post-1' }, { id: 'post-2' }];

function makeBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: any) => Promise.resolve({ data: draftPosts, error: null }).then(resolve),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => makeBuilder()),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args), error: (...args: unknown[]) => toastErrorMock(...args) },
}));
vi.mock('@/lib/i18n-toast', () => ({ notifySuccess: vi.fn() }));

import { useCampaignActions } from './useCampaignActions';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCampaignActions.activateAllPosts — distribute-post error visibility', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    invokeMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    draftPosts = [{ id: 'post-1' }, { id: 'post-2' }];
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('shows an error toast (not a false success claim) when a distribute-post call resolves with an error', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'downstream social API error' } });

    const { result } = renderHook(() => useCampaignActions(), { wrapper });
    result.current.activateAllPosts.mutate('campaign-1');

    await waitFor(() => expect(result.current.activateAllPosts.isSuccess).toBe(true));

    expect(errorSpy).toHaveBeenCalledWith('Failed to distribute post:', expect.objectContaining({ message: 'downstream social API error' }));
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('1 of 2 posts failed to distribute'));
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('shows the normal success toast when every distribute-post call succeeds', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });

    const { result } = renderHook(() => useCampaignActions(), { wrapper });
    result.current.activateAllPosts.mutate('campaign-1');

    await waitFor(() => expect(result.current.activateAllPosts.isSuccess).toBe(true));

    expect(errorSpy).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('2 posts distributed'));
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
