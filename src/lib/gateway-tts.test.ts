/**
 * BOOTSTRAP-FRONTEND-TTS-POLLY — frontend speech via the gateway.
 *
 * The assertions that matter here are the two that describe the outage this
 * fixes and the outage it must not cause:
 *
 *  1. No Google host is contacted, from anywhere in this module. Asserted as
 *     an inverse invariant ("no provider host is reached directly") rather
 *     than "the gateway was called", following VTID-03579 — pinning the
 *     positive re-hardcodes a provider one step further along and still misses
 *     a re-added direct call.
 *
 *  2. An unservable language DEGRADES rather than throwing. Serbian has no
 *     Polly voice in any engine, so `null` is an ordinary expected outcome and
 *     the caller falls back to browser speech. If this ever throws instead,
 *     Serbian users get an error toast rather than audio.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  synthesizeViaGateway,
  resetUnservableLangsForTests,
} from './gateway-tts';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

const okBody = {
  ok: true,
  audio_b64: 'QUJD',
  mime: 'audio/mp3',
  voice: 'Vicki',
  voice_type: 'Polly',
};

function mockFetch(impl: any) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  resetUnservableLangsForTests();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('synthesizeViaGateway', () => {
  it('returns the audio the gateway produced', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => okBody }));
    const res = await synthesizeViaGateway('Hallo', 'de-DE');
    expect(res).toEqual({
      audioB64: 'QUJD',
      mime: 'audio/mp3',
      voice: 'Vicki',
      voiceType: 'Polly',
    });
  });

  it('contacts the gateway and NO Google host', async () => {
    const fetchFn = mockFetch(async () => ({ ok: true, status: 200, json: async () => okBody }));
    await synthesizeViaGateway('Hallo', 'de-DE');

    const urls = fetchFn.mock.calls.map((c: any[]) => String(c[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u).not.toMatch(/googleapis|google-gemini-tts|google-cloud-tts|gstatic/i);
    }
    expect(urls.some((u) => u.includes('/orb/tts'))).toBe(true);
  });

  it('normalises a full locale tag to the base language the gateway expects', async () => {
    const fetchFn = mockFetch(async () => ({ ok: true, status: 200, json: async () => okBody }));
    await synthesizeViaGateway('Olá', 'pt-BR');
    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.lang).toBe('pt');
  });

  it('reads the MIME off the response instead of hardcoding mp3', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...okBody, mime: 'audio/ogg' }),
    }));
    const res = await synthesizeViaGateway('hi', 'en');
    expect(res?.mime).toBe('audio/ogg');
  });

  it('returns null WITHOUT throwing when the gateway cannot serve the language', async () => {
    // Serbian: no Polly voice in any engine. This must degrade, not error.
    mockFetch(async () => ({ ok: false, status: 400, json: async () => ({ ok: false }) }));
    await expect(synthesizeViaGateway('Zdravo', 'sr-RS')).resolves.toBeNull();
  });

  it('returns null when the response is 200 but carries no audio', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: 'no voice for lang' }),
    }));
    expect(await synthesizeViaGateway('Zdravo', 'sr')).toBeNull();
  });

  it('caches a refusal so an unservable language costs ONE round trip, not one per utterance', async () => {
    const fetchFn = mockFetch(async () => ({ ok: false, status: 400, json: async () => ({}) }));
    await synthesizeViaGateway('a', 'sr-RS');
    await synthesizeViaGateway('b', 'sr-RS');
    await synthesizeViaGateway('c', 'sr-RS');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache a transport failure — the network may recover', async () => {
    const fetchFn = mockFetch(async () => {
      throw new Error('network down');
    });
    expect(await synthesizeViaGateway('a', 'de')).toBeNull();
    expect(await synthesizeViaGateway('b', 'de')).toBeNull();
    // Two attempts, not one: a dropped request must not strand the user on
    // browser TTS for the rest of the session.
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('still sends the request when there is no auth session (route is optionalAuth)', async () => {
    const mod: any = await import('@/integrations/supabase/client');
    mod.supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchFn = mockFetch(async () => ({ ok: true, status: 200, json: async () => okBody }));

    const res = await synthesizeViaGateway('hi', 'en');

    expect(res).not.toBeNull();
    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('does not call the gateway at all for empty text', async () => {
    const fetchFn = mockFetch(async () => ({ ok: true, status: 200, json: async () => okBody }));
    expect(await synthesizeViaGateway('   ', 'de')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

/**
 * Tree-wide regression guard.
 *
 * The per-module test above proves THIS file contacts no Google host. It says
 * nothing about the rest of the app — and the outage this fixes was caused by
 * two OTHER files (`useTextToSpeech.ts`, `VoiceSettingsPanel.tsx`) calling
 * Google edge functions directly. VTID-03579 swept for exactly this pattern
 * and asserted the inverse invariant per-module, which is precisely why those
 * two call sites were never covered.
 *
 * So this walks the whole source tree instead.
 */
describe('no source file calls the decommissioned Google TTS edge functions', () => {
  it('finds zero references outside tests', async () => {
    const { readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        // This test file necessarily names the strings it forbids.
        if (entry.includes('.test.')) continue;
        const src = readFileSync(full, 'utf8');
        if (/google-gemini-tts|google-cloud-tts/.test(src)) offenders.push(full);
      }
    };
    walk('src');

    expect(offenders).toEqual([]);
  });

  it('actually scanned a non-trivial number of files', async () => {
    // A guard that silently scans nothing passes forever. Assert the walk
    // reached real files, the same way the db-i18n guard asserts a non-empty
    // file list.
    const { readdirSync, statSync } = await import('fs');
    const { join } = await import('path');
    let count = 0;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry)) count++;
      }
    };
    walk('src');
    expect(count).toBeGreaterThan(100);
  });
});
