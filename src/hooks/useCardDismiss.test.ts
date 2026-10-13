/** VTID-05085 — useCardDismiss: feature cards local with a 7-day TTL, E/G cards on the server. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const serverDismiss = vi.fn();
vi.mock('@/hooks/useEnrichmentCards', () => ({ useEnrichmentCardDismiss: () => serverDismiss }));

import { useCardDismiss, isFeatureCardDismissed, rememberFeatureCardDismissed } from './useCardDismiss';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => serverDismiss.mockReset());

describe('useCardDismiss', () => {
  it('a feature card is hidden on this device under vitana.card.<type>.dismissed_at', () => {
    const { result } = renderHook(() => useCardDismiss('F3'));
    expect(result.current.isDismissed).toBe(false);
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
    expect(localStorage.getItem('vitana.card.F3.dismissed_at')).toMatch(/^\d+$/);
    expect(serverDismiss).not.toHaveBeenCalled();
  });

  it('the feature dismissal expires after 7 days', () => {
    const now = Date.now();
    rememberFeatureCardDismissed('F9', now - 6 * DAY);
    expect(isFeatureCardDismissed('F9', now)).toBe(true);
    rememberFeatureCardDismissed('F9', now - 8 * DAY);
    expect(isFeatureCardDismissed('F9', now)).toBe(false);
  });

  it('an enrichment card dismisses on the server, never in localStorage', () => {
    const { result } = renderHook(() => useCardDismiss('E1'));
    act(() => result.current.dismiss());
    expect(serverDismiss).toHaveBeenCalledWith('E1');
    expect(localStorage.getItem('vitana.card.E1.dismissed_at')).toBeNull();
    expect(result.current.isDismissed).toBe(true);
  });

  it('blocked storage reads as "not dismissed" and never throws', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isFeatureCardDismissed('F3')).toBe(false);
    expect(() => rememberFeatureCardDismissed('F3')).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});
