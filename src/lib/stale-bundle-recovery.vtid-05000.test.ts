// VTID-05000 — stale-bundle recovery helpers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_RECOVERY_WINDOW_MS,
  RECOVERY_PARAM,
  RELOAD_KEY,
  autoRecoveryAllowed,
  buildCacheBustedUrl,
  clearAppCaches,
  clearAutoRecoveryMark,
  installPreloadErrorRecovery,
  markAutoRecovery,
  recoverFromStaleBundle,
  stripRecoveryParam,
} from './stale-bundle-recovery';

describe('buildCacheBustedUrl', () => {
  it('adds _vr and keeps other params and the hash', () => {
    const out = new URL(buildCacheBustedUrl('https://x.test/chat?thread=7&recipient=a#m1', 123));
    expect(out.searchParams.get(RECOVERY_PARAM)).toBe('123');
    expect(out.searchParams.get('thread')).toBe('7');
    expect(out.searchParams.get('recipient')).toBe('a');
    expect(out.hash).toBe('#m1');
  });

  it('replaces an existing _vr instead of stacking', () => {
    const out = new URL(buildCacheBustedUrl('https://x.test/?_vr=1', 2));
    expect(out.searchParams.getAll(RECOVERY_PARAM)).toEqual(['2']);
  });
});

describe('auto-recovery guard', () => {
  beforeEach(() => sessionStorage.clear());

  it('allows the first recovery and blocks a second within the window', () => {
    expect(autoRecoveryAllowed(1_000)).toBe(true);
    markAutoRecovery(1_000);
    expect(autoRecoveryAllowed(1_000 + AUTO_RECOVERY_WINDOW_MS)).toBe(false);
    expect(autoRecoveryAllowed(1_001 + AUTO_RECOVERY_WINDOW_MS)).toBe(true);
  });

  it('a manual action clears the mark', () => {
    markAutoRecovery(1_000);
    clearAutoRecoveryMark();
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull();
    expect(autoRecoveryAllowed(1_001)).toBe(true);
  });
});

describe('clearAppCaches', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deletes app caches but keeps firebase-* ones', async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['app-shell', 'firebase-x']), delete: del });
    await clearAppCaches();
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('app-shell');
  });

  it('never throws when caches is missing or rejects', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(clearAppCaches()).resolves.toBeUndefined();
    vi.stubGlobal('caches', { keys: vi.fn().mockRejectedValue(new Error('denied')), delete: vi.fn() });
    await expect(clearAppCaches()).resolves.toBeUndefined();
  });

  it('gives up after the timeout when the cache API hangs', async () => {
    vi.stubGlobal('caches', { keys: () => new Promise(() => {}), delete: vi.fn() });
    await expect(clearAppCaches(10)).resolves.toBeUndefined();
  });
});

describe('recoverFromStaleBundle', () => {
  const realLocation = window.location;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replace = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://x.test/events?thread=9', replace, reload: vi.fn() },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
    vi.unstubAllGlobals();
  });

  it('navigates to the current page with _vr, keeping deep-link params', async () => {
    vi.stubGlobal('caches', undefined);
    await recoverFromStaleBundle();
    const url = new URL(replace.mock.calls[0][0]);
    expect(url.pathname).toBe('/events');
    expect(url.searchParams.get('thread')).toBe('9');
    expect(url.searchParams.has(RECOVERY_PARAM)).toBe(true);
  });

  it('Go Home target keeps _vr', async () => {
    vi.stubGlobal('caches', undefined);
    await recoverFromStaleBundle('/');
    const url = new URL(replace.mock.calls[0][0]);
    expect(url.pathname).toBe('/');
    expect(url.searchParams.has(RECOVERY_PARAM)).toBe(true);
  });
});

describe('installPreloadErrorRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('caches', undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('prevents the error and marks the guard on the first event, then lets the second through', () => {
    installPreloadErrorRecovery();
    const first = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();

    const second = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
  });
});

describe('stripRecoveryParam', () => {
  it('removes only _vr from the address bar', () => {
    window.history.replaceState(null, '', '/events?thread=9&_vr=555#x');
    stripRecoveryParam();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/events?thread=9#x');
  });

  it('is a no-op without _vr', () => {
    window.history.replaceState(null, '', '/events?thread=9');
    stripRecoveryParam();
    expect(window.location.search).toBe('?thread=9');
  });
});
