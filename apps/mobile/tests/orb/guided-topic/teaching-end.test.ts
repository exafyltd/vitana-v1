/**
 * VTID-05649 — ORB guided topic: `focusGuidedTopic`, and the teaching-end event fired once per topic by the widget's
 * three triggers (directive, 45 s idle after audio / 5 min ceiling, close after audio). Fake transport, fake timers,
 * no network, no live session.
 */
import { createOrbSession } from '../../../src/orb/session';
import { resetTransportLatchForTests } from '../../../src/orb/select-transport';
import type { WebSocketCtor } from '../../../src/orb/transport-ws';
import type { MicPermission } from '../../../modules/vitana-voice/src/VitanaVoice';
import { createOrbController, type OrbControllerDeps, type OrbVoice } from '../../../src/orb/ui/orb-controller';
import { FakeSocket, FakeVoice, fakeFetch, flush } from '../helpers';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => '/home' }));
jest.mock('../../../src/identity/useRole', () => ({ useRole: () => ({ dbRole: 'community' }) }));

class PermVoice extends FakeVoice implements OrbVoice {
  async getMicrophonePermission(): Promise<MicPermission> {
    return { status: 'granted', canAskAgain: true };
  }
  async requestMicrophonePermission(): Promise<MicPermission> {
    return { status: 'granted', canAskAgain: true };
  }
}

async function settle(n = 8) {
  for (let i = 0; i < n; i++) await flush();
}

type Done = { topicId: string | null; reason: string | null };

function make(over: Partial<OrbControllerDeps> = {}) {
  const f = fakeFetch({
    '/api/v1/auth/me': () => ({ json: { ok: true } }),
    '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }),
  });
  const voice = new PermVoice();
  const done: Done[] = [];
  const c = createOrbController({
    gatewayUrl: 'http://127.0.0.1:8787',
    voice: () => voice,
    createSession: (d) => createOrbSession({ ...d, fetchImpl: f.impl, WebSocketImpl: FakeSocket as unknown as WebSocketCtor }),
    getAccessToken: async () => 'tok',
    navigate: () => ({ status: 'opened' }),
    lang: () => 'de-DE',
    appVersion: 'test',
    openUrl: jest.fn(),
    openSettings: jest.fn(),
    onGuidedTopicTeachingEnd: (topicId: string | null, reason: string | null) => {
      done.push({ topicId, reason });
    },
    ...over,
  } as OrbControllerDeps);
  return { c, voice, done };
}

function starts(): Array<Record<string, unknown>> {
  return FakeSocket.instances.flatMap((s) => s.sent.filter((m) => m.type === 'start'));
}

beforeEach(() => {
  FakeSocket.reset();
  resetTransportLatchForTests();
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'] });
});
afterEach(() => {
  jest.useRealTimers();
});

async function topicOpen() {
  const m = make();
  await m.c.focusGuidedTopic('t1');
  await settle();
  return m;
}

/** Advances fake time in 10 s steps, with a server heartbeat each step (the session's 30 s watchdog stays quiet). */
async function run(ms: number) {
  for (let left = ms; left > 0; left -= 10_000) {
    FakeSocket.last().serverSend({ type: 'heartbeat' });
    await jest.advanceTimersByTimeAsync(Math.min(10_000, left));
  }
}

function audio() {
  FakeSocket.last().serverSend({ type: 'audio', data_b64: 'AAAA', mime: 'audio/pcm;rate=24000' });
}

describe('focusGuidedTopic', () => {
  it('starts a session whose start message carries guided_topic_id', async () => {
    await topicOpen();
    expect(starts()).toHaveLength(1);
    expect(starts()[0]).toMatchObject({ guided_topic_id: 't1' });
  });

  it('ends a running session first and starts a new one with the topic; no teaching-end for the old session', async () => {
    const { c, done } = make();
    await c.open();
    await settle();
    expect('guided_topic_id' in starts()[0]).toBe(false);
    await c.focusGuidedTopic('t2');
    await settle();
    expect(starts()).toHaveLength(2);
    expect(starts()[1]).toMatchObject({ guided_topic_id: 't2' });
    expect(done).toEqual([]);
  });

  it('a plain open() after a topic session carries no topic (one-shot)', async () => {
    const { c } = await topicOpen();
    c.close();
    await c.open();
    await settle();
    expect('guided_topic_id' in starts()[starts().length - 1]).toBe(false);
  });
});

describe('triggers', () => {
  it('the end_guided_topic_teaching directive fires { topicId, reason } once', async () => {
    const { done } = await topicOpen();
    audio();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'end_guided_topic_teaching', topic_id: 't1', reason: 'lesson_done' });
    await jest.advanceTimersByTimeAsync(10_000);
    expect(done).toEqual([{ topicId: 't1', reason: 'lesson_done' }]);
  });

  it('only end_guided_topic_teaching reaches the teaching-end dep; end_conversation and end_teaching_session emit nothing', async () => {
    for (const [directive, expected] of [
      ['end_conversation', 0],
      ['end_teaching_session', 0],
      ['end_guided_topic_teaching', 1],
    ] as const) {
      FakeSocket.reset();
      const f = fakeFetch({
        '/api/v1/auth/me': () => ({ json: { ok: true } }),
        '/api/v1/orb/live/transport': () => ({ json: { ok: true, transport: 'ws' } }),
      });
      const spy = jest.fn();
      const session = createOrbSession({
        gatewayUrl: 'http://127.0.0.1:8787',
        getAccessToken: async () => 'tok',
        voice: new PermVoice(),
        navigate: () => ({ status: 'opened' }),
        lang: () => 'de-DE',
        appVersion: 'test',
        fetchImpl: f.impl,
        WebSocketImpl: FakeSocket as unknown as WebSocketCtor,
        onGuidedTopicTeachingEnd: spy,
      });
      await session.start({ guided_topic_id: 't1' });
      await settle();
      FakeSocket.last().serverSend({ type: 'orb_directive', directive, topic_id: 't1', reason: 'r' });
      await jest.advanceTimersByTimeAsync(10_000);
      expect(spy).toHaveBeenCalledTimes(expected);
      if (expected) expect(spy).toHaveBeenCalledWith('t1', 'r');
      expect(session.getSnapshot()).toMatchObject({ status: 'idle', endReason: 'end_directive' });
    }
  });

  it('45 s idle after audio → idle_after_lesson, once', async () => {
    const { done } = await topicOpen();
    audio();
    await run(40_000);
    expect(done).toEqual([]);
    await run(10_000);
    expect(done).toEqual([{ topicId: 't1', reason: 'idle_after_lesson' }]);
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(done).toHaveLength(1);
  });

  it('activity resets the idle clock', async () => {
    const { done } = await topicOpen();
    audio();
    await run(40_000);
    audio();
    await run(40_000);
    expect(done).toEqual([]);
  });

  it('5 min ceiling → backstop_timeout, even though audio never arrived', async () => {
    const { done } = await topicOpen();
    await run(4 * 60_000);
    expect(done).toEqual([]);
    await run(70_000);
    expect(done).toEqual([{ topicId: 't1', reason: 'backstop_timeout' }]);
  });

  it('no idle fire before any audio has been delivered', async () => {
    const { done } = await topicOpen();
    await run(2 * 60_000);
    expect(done).toEqual([]);
  });

  it('close after audio → overlay_closed_after_delivery', async () => {
    const { c, done } = await topicOpen();
    audio();
    c.close();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(done).toEqual([{ topicId: 't1', reason: 'overlay_closed_after_delivery' }]);
  });

  it('close before audio → no fire, and no later timer fires either', async () => {
    const { c, done } = await topicOpen();
    c.close();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(done).toEqual([]);
  });

  it('a second trigger after the first is ignored (directive, then close, then timers)', async () => {
    const { c, done } = await topicOpen();
    audio();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'end_guided_topic_teaching', topic_id: 't1', reason: 'lesson_done' });
    await jest.advanceTimersByTimeAsync(10_000);
    c.close();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(done).toHaveLength(1);
  });

  it('a new focus for the same topic can fire again (once per topic focus)', async () => {
    const { c, done } = await topicOpen();
    audio();
    c.close();
    await c.focusGuidedTopic('t1');
    await settle();
    audio();
    c.close();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(done).toHaveLength(2);
  });

  it('a session without a topic fires nothing for any trigger', async () => {
    const { c, done } = make();
    await c.open();
    await settle();
    audio();
    FakeSocket.last().serverSend({ type: 'orb_directive', directive: 'end_guided_topic_teaching', reason: 'x' });
    await jest.advanceTimersByTimeAsync(2 * 60_000);
    c.close();
    expect(done).toEqual([]);
  });
});

describe('OrbProvider bus bridge', () => {
  it('createAppOrbController emits vitana:guided-topic-teaching-complete { topicId, reason } on the overlay bus', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { overlayBus } = require('../../../src/navigation/overlay-bus') as typeof import('../../../src/navigation/overlay-bus');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { guidedTopicTeachingComplete, GUIDED_TOPIC_TEACHING_COMPLETE } = require('../../../src/orb/ui/OrbProvider') as typeof import('../../../src/orb/ui/OrbProvider');
    const seen: unknown[] = [];
    const off = overlayBus.on('vitana:guided-topic-teaching-complete', (d) => seen.push(d));
    guidedTopicTeachingComplete('t9', 'idle_after_lesson');
    off();
    expect(GUIDED_TOPIC_TEACHING_COMPLETE).toBe('vitana:guided-topic-teaching-complete');
    expect(seen).toEqual([{ topicId: 't9', reason: 'idle_after_lesson' }]);
  });
});
