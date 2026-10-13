/**
 * VTID-05143 review findings (PR #1366):
 *  - P2: a card deep link (/me/profile#avatar …) must reopen its editor every
 *    time, not only the first time (the hash used to stay in the URL, so the
 *    second click changed nothing).
 *  - P1: closing a profile editor re-reads the enrichment cards, so a card
 *    whose step was just saved disappears.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

import { useProfileEditorDeepLink } from './useProfileEditorDeepLink';
import { enrichmentCardsKey } from './useEnrichmentCards';

function setup(initial = '/me/profile?tab=about') {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const openers = { avatar: vi.fn(), about: vi.fn(), location: vi.fn(), cover: vi.fn(), interests: vi.fn() };
  const W = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({ link: useProfileEditorDeepLink(openers), navigate: useNavigate(), location: useLocation() }),
    { wrapper: W },
  );
  return { result, openers, invalidate };
}

describe('useProfileEditorDeepLink', () => {
  it('opens the editor named by the hash and drops the hash, keeping path and query', () => {
    const { result, openers } = setup();
    act(() => result.current.navigate('/me/profile?tab=about#avatar'));
    expect(openers.avatar).toHaveBeenCalledTimes(1);
    expect(result.current.location.hash).toBe('');
    expect(result.current.location.pathname).toBe('/me/profile');
    expect(result.current.location.search).toBe('?tab=about');
  });

  it('the same card clicked twice opens its editor twice', () => {
    const { result, openers } = setup();
    act(() => result.current.navigate('/me/profile#interests'));
    // the member closes the picker, then taps the same card again
    act(() => result.current.navigate('/me/profile#interests'));
    expect(openers.interests).toHaveBeenCalledTimes(2);
  });

  it('a landing URL with the hash opens the editor once', () => {
    const { openers } = setup('/me/profile#cover');
    expect(openers.cover).toHaveBeenCalledTimes(1);
  });

  it('ignores hashes that are not editors', () => {
    const { result, openers } = setup();
    act(() => result.current.navigate('/me/profile#posts'));
    for (const fn of Object.values(openers)) expect(fn).not.toHaveBeenCalled();
    expect(result.current.location.hash).toBe('#posts');
  });

  it('closing an editor re-reads the member\'s enrichment cards', () => {
    const { result, invalidate } = setup();
    act(() => result.current.link.onEditorClosed());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: enrichmentCardsKey('user-1') });
  });
});
