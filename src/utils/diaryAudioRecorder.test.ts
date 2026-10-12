/**
 * VTID-05097 — shouldUseBackendSTT() decides at call time (the Appilix bridge
 * is injected after page load), remembers a Web Speech failure for the page
 * session, and shouldFallbackToBackendSTT() only fires before any result.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

const DESKTOP_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
// The owner's Android Appilix build: no `wv` token.
const ANDROID_APP_NO_WV =
  'Mozilla/5.0 (Linux; Android; K) App11 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

type AppilixWindow = typeof window & { appilix?: { postMessage: (m: string) => void } };

function setUA(ua: string) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
}

async function load() {
  vi.resetModules();
  return import('./diaryAudioRecorder');
}

beforeEach(() => {
  window.sessionStorage.clear();
  delete (window as AppilixWindow).appilix;
  delete (window as { MediaRecorder?: unknown }).MediaRecorder;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as AppilixWindow).appilix;
});

describe('shouldUseBackendSTT (VTID-05097)', () => {
  it('is false on desktop Chrome with no bridge', async () => {
    setUA(DESKTOP_CHROME);
    const m = await load();
    expect(m.shouldUseBackendSTT()).toBe(false);
  });

  it('sees an Appilix bridge injected after the module was imported', async () => {
    setUA(ANDROID_APP_NO_WV);
    const m = await load();
    expect(m.shouldUseBackendSTT()).toBe(false);
    (window as AppilixWindow).appilix = { postMessage: () => {} };
    expect(m.shouldUseBackendSTT()).toBe(true);
  });

  it('stays on backend STT for the session once Web Speech was marked unavailable', async () => {
    setUA(ANDROID_APP_NO_WV);
    const m = await load();
    m.markWebSpeechUnavailable();
    expect(m.shouldUseBackendSTT()).toBe(true);
  });

  it('is true on iOS', async () => {
    setUA(IPHONE_SAFARI);
    const m = await load();
    expect(m.shouldUseBackendSTT()).toBe(true);
  });

  it('does not throw when sessionStorage is blocked', async () => {
    setUA(DESKTOP_CHROME);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const m = await load();
    expect(() => m.markWebSpeechUnavailable()).not.toThrow();
    expect(m.shouldUseBackendSTT()).toBe(false);
  });

  it('no longer exports its own (stale) isAppilixWebView', async () => {
    const m = await load();
    expect('isAppilixWebView' in m).toBe(false);
  });
});

describe('shouldFallbackToBackendSTT (VTID-05097)', () => {
  function withMediaRecorder() {
    (window as { MediaRecorder?: unknown }).MediaRecorder = class {};
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
  }

  it.each(['not-allowed', 'service-not-allowed', 'network'])('falls back on %s before any result', async (error) => {
    withMediaRecorder();
    const m = await load();
    expect(m.shouldFallbackToBackendSTT(error, false)).toBe(true);
  });

  it('does not fall back once speech was recognised', async () => {
    withMediaRecorder();
    const m = await load();
    expect(m.shouldFallbackToBackendSTT('network', true)).toBe(false);
  });

  it('does not fall back on recoverable or unrelated errors', async () => {
    withMediaRecorder();
    const m = await load();
    for (const e of ['no-speech', 'aborted', 'audio-capture', 'language-not-supported']) {
      expect(m.shouldFallbackToBackendSTT(e, false)).toBe(false);
    }
  });

  it('does not fall back when MediaRecorder is unavailable', async () => {
    const m = await load();
    expect(m.shouldFallbackToBackendSTT('not-allowed', false)).toBe(false);
  });
});
