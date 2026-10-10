import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./rum', () => ({
  getSessionId: () => 'session-test',
  sendRumPayload: vi.fn(),
}));

import { sendRumPayload } from './rum';
import {
  SCREEN_READY_CAP_MS,
  __resetScreenReadyForTests,
  classifyNav,
  countRefetched,
  measureScreenReady,
  normalizeRoute,
  onRouteChange,
  type ReadyEnv,
} from './screen-ready';

/** A deterministic clock + rAF queue + page model. */
function fakeEnv(opts: { images?: HTMLImageElement[]; busy?: () => boolean } = {}) {
  let time = 0;
  let nextId = 1;
  let queue: Array<{ id: number; cb: () => void }> = [];
  let hiddenCb: (() => void) | null = null;
  const state = { images: opts.images ?? [], busy: opts.busy ?? (() => false) };
  const env: ReadyEnv = {
    now: () => time,
    raf: (cb) => {
      const id = nextId++;
      queue.push({ id, cb });
      return id;
    },
    cancelRaf: (id) => {
      queue = queue.filter((q) => q.id !== id);
    },
    images: () => state.images,
    busy: () => state.busy(),
    onHidden: (cb) => {
      hiddenCb = cb;
      return () => {
        hiddenCb = null;
      };
    },
  };
  /** Advance one 16 ms frame and run the rAF callbacks queued for it. */
  const frame = () => {
    time += 16;
    const run = queue;
    queue = [];
    run.forEach((q) => q.cb());
  };
  const runFrames = (n: number) => {
    for (let i = 0; i < n; i++) frame();
  };
  return {
    env,
    state,
    frame,
    runFrames,
    setTime: (t: number) => {
      time = t;
    },
    get time() {
      return time;
    },
    pending: () => queue.length,
    hide: () => hiddenCb?.(),
  };
}

function img(complete: boolean, src = 'https://x.supabase.co/storage/v1/render/image/public/a.jpg'): HTMLImageElement {
  const el = document.createElement('img');
  Object.defineProperty(el, 'complete', { value: complete, configurable: true, writable: true });
  Object.defineProperty(el, 'currentSrc', { value: src, configurable: true });
  return el;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  __resetScreenReadyForTests();
  vi.mocked(sendRumPayload).mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('normalizeRoute', () => {
  it('maps known parameterised routes to their pattern', () => {
    expect(normalizeRoute('/comm/groups/1b4e28ba-2fa1-11d2-883f-0016d3cca427')).toBe('/comm/groups/:id');
    expect(normalizeRoute('/inbox/t/abc/msg/def')).toBe('/inbox/t/:threadId/msg/:messageId');
    expect(normalizeRoute('/u/some.handle')).toBe('/u/:identifier');
    expect(normalizeRoute('/i/INVITE42')).toBe('/i/:code');
    expect(normalizeRoute('/commerce/invites/secret-token/accept')).toBe('/commerce/invites/:token/accept');
  });

  it('prefers a static route over a parameterised one', () => {
    expect(normalizeRoute('/profile/subscriptions')).toBe('/profile/subscriptions');
    expect(normalizeRoute('/profile/42')).toBe('/profile/:id');
  });

  it('leaves static tab routes untouched and strips a trailing slash', () => {
    expect(normalizeRoute('/home')).toBe('/home');
    expect(normalizeRoute('/comm/events-meetups/')).toBe('/comm/events-meetups');
    expect(normalizeRoute('/')).toBe('/');
    expect(normalizeRoute('')).toBe('/');
  });

  it('collapses id-looking segments on routes it does not know', () => {
    expect(normalizeRoute('/admin/tenants/1b4e28ba-2fa1-11d2-883f-0016d3cca427/edit')).toBe('/admin/tenants/:id/edit');
    expect(normalizeRoute('/backoffice/invoices/12345')).toBe('/backoffice/invoices/:id');
    expect(normalizeRoute('/admin/x/0123456789abcdef0123')).toBe('/admin/x/:id');
    expect(normalizeRoute('/admin/x/aB3dE5gH7jK9mN1pQ3sT5')).toBe('/admin/x/:id');
    expect(normalizeRoute('/admin/user-management')).toBe('/admin/user-management');
  });
});

describe('classifyNav', () => {
  it('is first until the route pattern has been shown, then return', () => {
    const visited = new Set<string>(['/home']);
    expect(classifyNav('/inbox', visited)).toBe('first');
    expect(classifyNav('/home', visited)).toBe('return');
  });
});

describe('countRefetched', () => {
  const a = 'https://cdn/a.jpg';
  const b = 'https://cdn/b.jpg';
  it('counts only images transferred over the network after the navigation', () => {
    const entries = [
      { name: a, startTime: 50, transferSize: 9000 }, // before nav → ignored
      { name: a, startTime: 120, transferSize: 0 }, // cache hit after nav
      { name: b, startTime: 130, transferSize: 4000 }, // network after nav
    ];
    expect(countRefetched([a, b], 100, entries)).toBe(1);
  });

  it('is 0 when there are no entries (memory cache) and counts each image once', () => {
    expect(countRefetched([a], 100, [])).toBe(0);
    expect(
      countRefetched([a], 100, [
        { name: a, startTime: 110, transferSize: 10 },
        { name: a, startTime: 120, transferSize: 10 },
      ]),
    ).toBe(1);
  });
});

describe('measureScreenReady', () => {
  it('waits two frames after commit, then reports when every first-viewport image is complete', async () => {
    const pending = img(false);
    const f = fakeEnv({ images: [img(true), pending] });
    f.setTime(100);
    const m = measureScreenReady(100, f.env);
    let result: Awaited<typeof m.done> | undefined;
    void m.done.then((r) => (result = r));

    f.runFrames(10);
    await flush();
    expect(result).toBeUndefined();

    Object.defineProperty(pending, 'complete', { value: true });
    f.runFrames(4); // next check is at most 50 ms later
    await flush();
    expect(result).toBeTruthy();
    expect(result!.timed_out).toBe(false);
    expect(result!.images).toHaveLength(2);
    expect(result!.ready_ms).toBeGreaterThan(160);
    expect(result!.ready_ms).toBeLessThanOrEqual(f.time - 100);
  });

  it('is ready after two frames when nothing is loading', async () => {
    const f = fakeEnv();
    const m = measureScreenReady(0, f.env);
    f.runFrames(2);
    const r = await m.done;
    expect(r).toEqual({ ready_ms: 32, timed_out: false, images: [] });
  });

  it('is not ready while a loading indicator is visible', async () => {
    let busy = true;
    const f = fakeEnv({ busy: () => busy });
    const m = measureScreenReady(0, f.env);
    let r: unknown;
    void m.done.then((x) => (r = x));
    f.runFrames(20);
    await flush();
    expect(r).toBeUndefined();
    busy = false;
    f.runFrames(4);
    await flush();
    expect(r).toMatchObject({ timed_out: false });
  });

  it('caps at 10 s with timed_out when an image never completes', async () => {
    const f = fakeEnv({ images: [img(false)] });
    const m = measureScreenReady(0, f.env);
    f.runFrames(Math.ceil(SCREEN_READY_CAP_MS / 16) + 2);
    const r = await m.done;
    expect(r).toMatchObject({ ready_ms: 10000, timed_out: true });
    expect(r!.images).toHaveLength(1);
    expect(f.pending()).toBe(0);
  });

  it('drops the measurement when the tab is hidden or it is cancelled', async () => {
    const f = fakeEnv({ images: [img(false)] });
    const m = measureScreenReady(0, f.env);
    f.runFrames(3);
    f.hide();
    expect(await m.done).toBeNull();

    const m2 = measureScreenReady(f.time, f.env);
    m2.cancel();
    expect(await m2.done).toBeNull();
  });
});

describe('onRouteChange', () => {
  it('sends nothing for the initial page load or a repeat of the same pathname', async () => {
    const f = fakeEnv();
    onRouteChange('/home', 0, f.env);
    f.runFrames(5);
    onRouteChange('/home', 10, f.env);
    f.runFrames(5);
    await flush();
    expect(sendRumPayload).not.toHaveBeenCalled();
  });

  it('sends one nav beacon per navigation: first, then return, with the payload shape', async () => {
    const f = fakeEnv();
    onRouteChange('/home', 0, f.env); // initial load → /home counts as shown

    onRouteChange('/inbox', f.time, f.env);
    f.runFrames(3);
    await flush();
    onRouteChange('/home', f.time, f.env);
    f.runFrames(3);
    await flush();
    onRouteChange('/home', f.time, f.env); // re-render, same location
    f.runFrames(3);
    await flush();

    expect(sendRumPayload).toHaveBeenCalledTimes(2);
    const [first, ret] = vi.mocked(sendRumPayload).mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(first).toMatchObject({ kind: 'nav', screen: '/inbox', nav: 'first', img_refetch: 0, img_total: 0, timed_out: false, session: 'session-test' });
    expect(ret).toMatchObject({ kind: 'nav', screen: '/home', nav: 'return' });
    expect(Object.keys(first).sort()).toEqual(
      ['captured_at', 'img_refetch', 'img_total', 'kind', 'nav', 'ready_ms', 'screen', 'session', 'timed_out', 'user_agent'].sort(),
    );
    expect(typeof first.ready_ms).toBe('number');
    expect(Number.isInteger(first.ready_ms)).toBe(true);
    expect(String(first.captured_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('collapses ids so two groups are the same screen (second visit is a return)', async () => {
    const f = fakeEnv();
    onRouteChange('/home', 0, f.env);
    onRouteChange('/comm/groups/11111111-1111-1111-1111-111111111111', f.time, f.env);
    f.runFrames(3);
    await flush();
    onRouteChange('/comm/groups/22222222-2222-2222-2222-222222222222', f.time, f.env);
    f.runFrames(3);
    await flush();
    const calls = vi.mocked(sendRumPayload).mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(calls.map((c) => [c.screen, c.nav])).toEqual([
      ['/comm/groups/:id', 'first'],
      ['/comm/groups/:id', 'return'],
    ]);
  });

  it('drops a measurement superseded by the next navigation', async () => {
    const f = fakeEnv({ images: [img(false)] });
    onRouteChange('/home', 0, f.env);
    onRouteChange('/inbox', f.time, f.env);
    f.runFrames(5);
    f.state.images = [];
    onRouteChange('/autopilot', f.time, f.env);
    f.runFrames(3);
    await flush();
    const calls = vi.mocked(sendRumPayload).mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(calls.map((c) => c.screen)).toEqual(['/autopilot']);
  });

  async function returnVisitWith(setup: (navStartRef: { value: number }) => void) {
    const f = fakeEnv();
    const navStartRef = { value: 0 };
    setup(navStartRef);
    onRouteChange('/home', 0, f.env);
    onRouteChange('/inbox', f.time, f.env);
    f.runFrames(3);
    await flush();
    navStartRef.value = f.time;
    f.state.images = [img(true, URL_A), img(true, URL_B)];
    onRouteChange('/home', navStartRef.value, f.env);
    f.runFrames(3);
    await flush();
    return vi.mocked(sendRumPayload).mock.calls.at(-1)![0] as Record<string, unknown>;
  }
  const URL_A = 'https://x.supabase.co/storage/v1/render/image/public/a.jpg';
  const URL_B = 'https://x.supabase.co/storage/v1/render/image/public/b.jpg';
  const entriesFor = (navStart: number) => [
    { name: URL_A, initiatorType: 'img', startTime: navStart - 500, transferSize: 5000 }, // before nav
    { name: URL_A, initiatorType: 'img', startTime: navStart + 5, transferSize: 5000 }, // re-downloaded
    { name: URL_B, initiatorType: 'img', startTime: navStart + 5, transferSize: 0 }, // HTTP cache
  ];

  it('counts first-viewport images re-downloaded on a return visit (PerformanceObserver ring)', async () => {
    // takeRecords() hands over entries the observer callback has not delivered yet.
    let records: () => unknown[] = () => [];
    class FakeObserver {
      observe() {}
      disconnect() {}
      takeRecords() {
        return records();
      }
    }
    vi.stubGlobal('PerformanceObserver', FakeObserver);
    try {
      const last = await returnVisitWith((ref) => {
        records = () => (ref.value > 0 ? entriesFor(ref.value) : []);
      });
      expect(last).toMatchObject({ screen: '/home', nav: 'return', img_refetch: 1, img_total: 2 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to performance.getEntriesByName without PerformanceObserver', async () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    try {
      const last = await returnVisitWith((ref) => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation(
          (name: string) => entriesFor(ref.value).filter((e) => e.name === name) as unknown as PerformanceEntryList,
        );
      });
      expect(last).toMatchObject({ screen: '/home', nav: 'return', img_refetch: 1, img_total: 2 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
