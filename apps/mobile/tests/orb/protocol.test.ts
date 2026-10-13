/** VTID-05179 — ORB protocol constants, start payload, SSE parser (N6a, Changes 2–3). */
import {
  CLIENT_MESSAGE_TYPES,
  HANDLED_BY_NATIVE,
  IGNORED_BY_NATIVE,
  ORB_AUDIO,
  ORB_DUPLEX,
  buildStartPayload,
  gatewayBase,
  playbackRateFor,
  rateFromMime,
} from '../../src/orb/protocol';
import { SseParser, type SseEvent } from '../../src/orb/sse-parser';
import sseFixture from '../../src/orb/__fixtures__/sse-stream.json';

describe('start payload (F6)', () => {
  const payload = buildStartPayload({
    lang: 'de',
    currentRoute: '/home',
    surface: 'vitanaland',
    viewRole: 'community',
    recentRoutes: ['/a', '/b', '/c', '/d', '/e', '/f'],
    appVersion: '0.0.0-dev',
    timeZone: 'Europe/Berlin',
  });

  it('carries exactly the F6 field set', () => {
    expect(Object.keys(payload).sort()).toEqual(
      [
        'app_version',
        'client_timezone',
        'current_route',
        'is_mobile',
        'lang',
        'recent_routes',
        'response_modalities',
        'surface',
        'vad_silence_ms',
        'view_role',
        'voice_style',
      ].sort(),
    );
    expect(payload.is_mobile).toBe(true);
    expect(payload.vad_silence_ms).toBe(600);
    expect(payload.response_modalities).toEqual(['audio', 'text']);
    expect(payload.recent_routes).toEqual(['/a', '/b', '/c', '/d', '/e']);
  });

  it('never names a voice: the server picks persona and voice (rule 42a)', () => {
    const keys = Object.keys(payload).join(',').toLowerCase();
    expect(keys).not.toMatch(/voice_?id|voice_name|speaker|persona/);
  });

  it('omits optional fields that are not known', () => {
    expect(Object.keys(buildStartPayload({ lang: 'en', timeZone: '' })).sort()).toEqual(
      ['is_mobile', 'lang', 'response_modalities', 'vad_silence_ms', 'voice_style'].sort(),
    );
  });
});

describe('audio constants', () => {
  it('frame = 1024 samples at 16 kHz = 64 ms, 2048 bytes', () => {
    expect((ORB_AUDIO.FRAME_SAMPLES / ORB_AUDIO.IN_RATE) * 1000).toBe(64);
    expect(ORB_AUDIO.FRAME_SAMPLES * 2).toBe(2048);
  });

  it('rate from mime, 24000 fallback', () => {
    expect(rateFromMime('audio/pcm;rate=16000')).toBe(16000);
    expect(rateFromMime('audio/pcm;rate=24000')).toBe(24000);
    expect(rateFromMime('audio/pcm')).toBe(24000);
    expect(rateFromMime(undefined)).toBe(24000);
  });

  it('playback rate 1.1 for German, 1.05 otherwise', () => {
    expect(playbackRateFor('de')).toBe(1.1);
    expect(playbackRateFor('de-AT')).toBe(1.1);
    expect(playbackRateFor('en')).toBe(1.05);
    expect(playbackRateFor('sr')).toBe(1.05);
  });

  it('gateway base strips /api/v1 and trailing slashes', () => {
    expect(gatewayBase('http://127.0.0.1:8787/api/v1/')).toBe('http://127.0.0.1:8787');
    expect(gatewayBase('https://g1.example.org')).toBe('https://g1.example.org');
  });
});

describe('message classification', () => {
  it('handled and ignored lists are disjoint, and every ignored type has a reason', () => {
    for (const t of Object.keys(IGNORED_BY_NATIVE)) {
      expect(HANDLED_BY_NATIVE as readonly string[]).not.toContain(t);
      expect(IGNORED_BY_NATIVE[t].length).toBeGreaterThan(5);
    }
  });

  it('the client sends only the types the plan names', () => {
    expect([...CLIENT_MESSAGE_TYPES].sort()).toEqual(
      ['audio', 'audio_ready', 'context_update', 'interrupt', 'nav_result', 'ping', 'start', 'stop'].sort(),
    );
  });

  it('orb_duplex values are the three R2-F14 strings', () => {
    expect(Object.values(ORB_DUPLEX).sort()).toEqual(
      ['full_duplex', 'half_duplex:ios16_path_unverified', 'half_duplex:no_aec'].sort(),
    );
  });
});

describe('SSE parser', () => {
  const stream: string = sseFixture.stream;
  const expected = sseFixture.expected as SseEvent[];

  it('parses the fixture in one chunk', () => {
    expect(new SseParser().push(stream)).toEqual(expected);
  });

  it('gives the same events for a split at every offset', () => {
    for (let i = 0; i <= stream.length; i++) {
      const p = new SseParser();
      const got = [...p.push(stream.slice(0, i)), ...p.push(stream.slice(i))];
      expect({ i, got }).toEqual({ i, got: expected });
    }
  });

  it('gives the same events when fed one character at a time', () => {
    const p = new SseParser();
    const got: SseEvent[] = [];
    for (const ch of stream) got.push(...p.push(ch));
    expect(got).toEqual(expected);
  });

  it('every fixture event is a JSON server message', () => {
    for (const ev of expected) expect(typeof JSON.parse(ev.data).type).toBe('string');
  });
});
