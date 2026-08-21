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

  // The suite used to assert the opposite of these: that ANY failed response
  // cached the language for the rest of the session. That cached a transient
  // failure as if it were a permanent capability fact, so a 401/429/500 left a
  // perfectly serviceable language on browser speech until the user reloaded.
  // An HTTP error means "this REQUEST failed", not "this LANGUAGE cannot be
  // served"; only a permanent failure makes those the same thing.

  it('does NOT cache a 500 — a gateway outage must not strand the language for the session', async () => {
    const fetchFn = mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await synthesizeViaGateway('a', 'de-DE');
    await synthesizeViaGateway('b', 'de-DE');
    await synthesizeViaGateway('c', 'de-DE');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('does NOT cache a 401 — token trouble is recoverable', async () => {
    const fetchFn = mockFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await synthesizeViaGateway('a', 'de');
    await synthesizeViaGateway('b', 'de');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a 429 — throttling is by definition temporary', async () => {
    const fetchFn = mockFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    await synthesizeViaGateway('a', 'fr');
    await synthesizeViaGateway('b', 'fr');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('recovers on the very next call once the gateway comes back', async () => {
    // The behaviour the old cache made impossible without a page reload.
    let call = 0;
    mockFetch(async () => {
      call += 1;
      return call === 1
        ? { ok: false, status: 503, json: async () => ({}) }
        : {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, audio_b64: 'QUJD', mime: 'audio/mpeg', voice: 'Vicki', voice_type: 'Polly' }),
          };
    });
    expect(await synthesizeViaGateway('a', 'de')).toBeNull();
    const second = await synthesizeViaGateway('b', 'de');
    expect(second?.audioB64).toBe('QUJD');
  });

  it('does NOT cache a 200 that carries no audio — an empty response is an anomaly, not a capability fact', async () => {
    const fetchFn = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: 'no voice for lang' }),
    }));
    await synthesizeViaGateway('a', 'sr-RS');
    await synthesizeViaGateway('b', 'sr-RS');
    expect(fetchFn).toHaveBeenCalledTimes(2);
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
 * Tree-wide consent guard.
 *
 * Cloud speech sends the user's text to a third-party provider, so it is
 * gated on AI-data consent. `useTextToSpeech` checks `hasConsent` and uses
 * browser synthesis when it is absent — but `VoiceSettingsPanel` was moved
 * onto the gateway WITHOUT that check, so pressing "Preview Voice" sent the
 * phrase to the cloud even for a user who had withheld or revoked consent.
 *
 * Pinning that one component would only re-prove the fix. The defect was that
 * a SECOND call site appeared and did not inherit the rule, which is the same
 * shape as the Google-edge-function guard below: the per-module test passed
 * while two other files bypassed it entirely.
 *
 * So this asserts the invariant across the tree — every caller of
 * `synthesizeViaGateway` must also consult consent — and therefore covers call
 * sites that do not exist yet.
 */
describe('every caller of the cloud TTS gateway honours AI consent', () => {
  it('finds no call site that reaches the gateway without checking consent', async () => {
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
        if (entry.includes('.test.')) continue;
        // The module that DEFINES the call is not a caller of it. It is
        // deliberately consent-agnostic: it is a transport, and the decision
        // belongs to the call sites that know the user context.
        if (full.endsWith(join('src', 'lib', 'gateway-tts.ts'))) continue;

        const src = readFileSync(full, 'utf8');
        if (!src.includes('synthesizeViaGateway')) continue;
        if (!/hasConsent/.test(src)) offenders.push(full);
      }
    };
    walk('src');

    expect(offenders).toEqual([]);
  });

  it('actually found the known call sites — a guard that scans nothing passes forever', async () => {
    const { readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        if (entry.includes('.test.')) continue;
        if (full.endsWith(join('src', 'lib', 'gateway-tts.ts'))) continue;
        if (readFileSync(full, 'utf8').includes('synthesizeViaGateway')) callers.push(full);
      }
    };
    walk('src');
    // useTextToSpeech.ts and VoiceSettingsPanel.tsx, at minimum.
    expect(callers.length).toBeGreaterThanOrEqual(2);
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
