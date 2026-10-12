/** VTID-05105 — Spotlight switch: tenant flag, preview override (wins both ways), phones never. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySpotlightQuery, readSpotlightOverride, resolveSpotlight, SPOTLIGHT_STORAGE_KEY } from './useSpotlightEnabled';

afterEach(() => vi.restoreAllMocks());

describe('VTID-05105 useSpotlightEnabled', () => {
  it('phones never get Spotlight, whatever the flag or override', () => {
    expect(resolveSpotlight(true, true, true)).toBe(false);
  });

  it('no override → follows the tenant flag', () => {
    expect(resolveSpotlight(false, null, true)).toBe(true);
    expect(resolveSpotlight(false, null, false)).toBe(false);
  });

  it('an explicit override wins in both directions', () => {
    expect(resolveSpotlight(false, true, false)).toBe(true);
    expect(resolveSpotlight(false, false, true)).toBe(false);
  });

  it('?spotlight=1 / 0 persist, clear removes, anything else reads storage', () => {
    expect(applySpotlightQuery('?spotlight=1')).toBe(true);
    expect(localStorage.getItem(SPOTLIGHT_STORAGE_KEY)).toBe('1');
    expect(applySpotlightQuery('?foo=bar')).toBe(true);
    expect(applySpotlightQuery('?spotlight=0')).toBe(false);
    expect(readSpotlightOverride()).toBe(false);
    expect(applySpotlightQuery('?spotlight=clear')).toBeNull();
    expect(localStorage.getItem(SPOTLIGHT_STORAGE_KEY)).toBeNull();
  });

  it('blocked storage never throws and falls back to the query or no override', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(applySpotlightQuery('?spotlight=1')).toBe(true);
    expect(applySpotlightQuery('')).toBeNull();
    expect(readSpotlightOverride()).toBeNull();
  });
});
