// VTID-05062 — phone journey robot: tab switches stay fast and photos do not
// reload when a member comes back to a screen.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user and only taps the bottom tabs:
//   News → Postfach → Events → Reise → News → Events
// Nothing is posted, liked or changed.
//
// Device: a mid-range phone — Pixel 7 viewport/DPR/UA with touch, 4× CPU
// throttle and a "Fast 4G"-like network (150 ms RTT, ~9 Mbit/s down,
// ~1.5 Mbit/s up) via CDP.
//
// Per step it measures SCREEN_READY with the same definition as the app's RUM
// (src/lib/screen-ready.ts): from the tap until the new route is on screen
// (pathname + two frames), no loading indicator is visible in the first
// viewport, and every first-viewport <img> is complete. Capped at 10 s.
//
// Image refetch on return visits — and why this spec carries its own HTTP
// cache: Playwright disables the browser cache (memory cache included) for a
// page that has any request route, and the staging guard routes every
// request. Without a cache, every photo that remounts on a return visit would
// be re-downloaded here even when a real phone serves it from cache. So
// Supabase storage images are routed through a small in-test cache that
// follows the response's own Cache-Control (max-age / s-maxage, no-store,
// no-cache, heuristic freshness from Last-Modified) — what a phone's HTTP cache
// would decide. A return step that has to fetch a storage image the journey
// already loaded (same path and transform params; a changed signed-URL token
// counts as the same image) is a refetch. A cache hit is fulfilled locally and
// never touches the network. Misses go through the guard to the network as
// plain GETs.
//
// The ORB voice overlay auto-opens on /home for a MAXINA member and its live
// session POSTs to the gateway; the widget script is aborted client-side (as
// in VTID-05013's spec).
import type { Page, Request, Response, Route } from '@playwright/test';
import { test, expect } from './staging-guard';

const PIXEL_7_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

test.use({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent: PIXEL_7_UA,
  // Same read-only lookups the signed-in app sends as POST as in VTID-05013's
  // spec: still aborted, never writes.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const CAP_MS = 10_000;
const FIRST_BUDGET_MS = 4_000;
const RETURN_BUDGET_MS = 1_500;
const STABILITY_WAIT_MS = 1_500;

const JOURNEY: Array<{ path: string; label: string }> = [
  { path: '/inbox', label: 'Postfach' },
  { path: '/comm/events-meetups', label: 'Events' },
  { path: '/autopilot', label: 'Reise' },
  { path: '/home', label: 'News' },
  { path: '/comm/events-meetups', label: 'Events' },
];

type ReadyResult = { ready_ms: number; timed_out: boolean; img_total: number; images: string[] };

// ─── In-page SCREEN_READY (mirrors src/lib/screen-ready.ts) ──────────────────

/** Records the time of the next tap (pointerdown/touchstart) in page time. */
function installTapClock() {
  const w = window as unknown as { __sjArmed?: boolean; __sjTapAt?: number };
  const onTap = () => {
    if (!w.__sjArmed) return;
    w.__sjArmed = false;
    w.__sjTapAt = performance.now();
  };
  document.addEventListener('pointerdown', onTap, { capture: true });
  document.addEventListener('touchstart', onTap, { capture: true });
}

function waitScreenReady(args: { path: string; cap: number; fromNavigationStart: boolean }): Promise<ReadyResult> {
  const w = window as unknown as { __sjTapAt?: number };
  const start = args.fromNavigationStart ? 0 : (w.__sjTapAt ?? performance.now());
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inViewport = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && getComputedStyle(el).visibility !== 'hidden';
  };
  const busy = () =>
    Array.from(document.querySelectorAll('.animate-spin, [aria-busy="true"]')).some(inViewport) ||
    Array.from(document.querySelectorAll('.animate-pulse')).some((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= 24 && r.height >= 8 && inViewport(el);
    });
  const images = () => Array.from(document.querySelectorAll('img')).filter(inViewport);
  return new Promise((resolve) => {
    let framesSinceCommit = -1;
    let lastCheck = -Infinity;
    const tick = () => {
      const now = performance.now();
      if (now - start >= args.cap) {
        const imgs = images();
        resolve({ ready_ms: args.cap, timed_out: true, img_total: imgs.length, images: imgs.map((i) => i.currentSrc || i.src) });
        return;
      }
      if (framesSinceCommit < 0 && location.pathname === args.path) framesSinceCommit = 0;
      else if (framesSinceCommit >= 0) framesSinceCommit++;
      if (framesSinceCommit >= 2 && now - lastCheck >= 50) {
        lastCheck = now;
        if (!busy()) {
          const imgs = images();
          if (imgs.every((i) => i.complete)) {
            resolve({ ready_ms: Math.round(now - start), timed_out: false, img_total: imgs.length, images: imgs.map((i) => i.currentSrc || i.src) });
            return;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Heights of the feed media frames in the first viewport; remembers the elements. */
function captureFrameHeights(): number[] {
  const w = window as unknown as { __sjFrames?: Element[] };
  const vh = window.innerHeight;
  const frames = Array.from(document.querySelectorAll('[data-testid="feed-media"]')).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom > 0 && r.top < vh;
  });
  w.__sjFrames = frames;
  return frames.map((el) => el.getBoundingClientRect().height);
}

function recheckFrameHeights(): Array<number | null> {
  const w = window as unknown as { __sjFrames?: Element[] };
  return (w.__sjFrames ?? []).map((el) => (el.isConnected ? el.getBoundingClientRect().height : null));
}

// ─── In-test HTTP cache for Supabase storage images ──────────────────────────

const STORAGE_IMAGE = /^https:\/\/inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/(object|render\/image)\//;

/** Same image = same path + transform params; a signed URL's token may change. */
function imageKey(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('token');
  u.searchParams.sort();
  return `${u.origin}${u.pathname}?${u.searchParams.toString()}`;
}

type CachedImage = { status: number; headers: Record<string, string>; body: Buffer; storedAt: number; freshMs: number };

function freshnessMs(headers: Record<string, string>): number {
  const cc = (headers['cache-control'] ?? '').toLowerCase();
  if (/no-store|no-cache/.test(cc)) return 0;
  const m = cc.match(/s-maxage=(\d+)/) ?? cc.match(/max-age=(\d+)/);
  if (m) return Number(m[1]) * 1000;
  if (headers['expires'] && headers['date']) return Math.max(0, Date.parse(headers['expires']) - Date.parse(headers['date']));
  if (headers['last-modified']) {
    const date = headers['date'] ? Date.parse(headers['date']) : Date.now();
    return Math.max(0, (date - Date.parse(headers['last-modified'])) / 10); // RFC 9111 §4.2.2 heuristic
  }
  return 0;
}

function storageImageCache(page: Page) {
  const cache = new Map<string, CachedImage>();
  const everLoaded = new Set<string>();
  let step = { networkFetches: [] as string[], refetches: [] as string[], cacheHits: 0 };

  const onRoute = async (route: Route) => {
    const req = route.request();
    if (req.method() !== 'GET' || req.resourceType() !== 'image') return route.fallback();
    const key = imageKey(req.url());
    const hit = cache.get(key);
    if (hit && Date.now() - hit.storedAt < hit.freshMs) {
      step.cacheHits++;
      return route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
    }
    step.networkFetches.push(req.url());
    if (everLoaded.has(key)) step.refetches.push(req.url());
    return route.fallback(); // → staging guard → network (a GET)
  };

  const onResponse = async (res: Response) => {
    const req: Request = res.request();
    if (req.resourceType() !== 'image' || !STORAGE_IMAGE.test(req.url()) || res.status() !== 200) return;
    const key = imageKey(req.url());
    everLoaded.add(key);
    if (cache.has(key) && Date.now() - cache.get(key)!.storedAt < cache.get(key)!.freshMs) return;
    const headers = { ...(await res.allHeaders().catch(() => ({}) as Record<string, string>)) };
    // res.body() is already decoded; replaying the original encoding/length would corrupt it.
    delete headers['content-encoding'];
    delete headers['content-length'];
    const freshMs = freshnessMs(headers);
    if (freshMs <= 0) return;
    const body = await res.body().catch(() => null);
    if (body) cache.set(key, { status: 200, headers, body, storedAt: Date.now(), freshMs });
  };

  return {
    async install() {
      await page.route(STORAGE_IMAGE, onRoute);
      page.on('response', (res) => void onResponse(res));
    },
    beginStep() {
      step = { networkFetches: [], refetches: [], cacheHits: 0 };
    },
    get step() {
      return step;
    },
  };
}

// ─── The journey ─────────────────────────────────────────────────────────────

test('phone journey: tab switches are ready fast and return visits reload nothing', async ({ page, request }) => {
  test.setTimeout(5 * 60_000);
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.route(/\/command-hub\/orb-widget\.js(\?.*)?$/, (route) => route.abort('blockedbyclient'));
  await page.addInitScript(installTapClock);
  const images = storageImageCache(page);
  await images.install();

  // Sign in (unthrottled) exactly as VTID-05013's spec does.
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(anon)).text();
  const key = [...bundle.matchAll(/eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].find((m) => {
    try {
      const p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      return p.role === 'anon' && p.ref === 'inmkhvwdcuyhnxkgfvsb';
    } catch {
      return false;
    }
  })?.[0];
  expect(key, 'no Supabase publishable key in the bundle').toBeTruthy();
  const session = await (
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, { headers: { apikey: key!, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // Mid-range phone from here on.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: Math.round((9 * 1024 * 1024) / 8),
    uploadThroughput: Math.round((1.5 * 1024 * 1024) / 8),
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // Start: cold load of News (covered by LCP RUM; logged, not asserted).
  images.beginStep();
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href="/inbox"]:visible').first(), 'bottom tab bar did not render').toBeVisible({ timeout: 60_000 });
  const start = await page.evaluate(waitScreenReady, { path: '/home', cap: 60_000, fromNavigationStart: true });

  type Row = { step: string; nav: 'first' | 'return'; ready_ms: number; timed_out: boolean; img_total: number; net_images: number; cache_hits: number; refetches: number; frame_changes: number; problems: string[] };
  const rows: Row[] = [
    { step: 'start /home (cold)', nav: 'first', ready_ms: start.ready_ms, timed_out: start.timed_out, img_total: start.img_total, net_images: images.step.networkFetches.length, cache_hits: images.step.cacheHits, refetches: 0, frame_changes: 0, problems: [] },
  ];
  const visited = new Set<string>(['/home']);

  for (const { path, label } of JOURNEY) {
    const nav: 'first' | 'return' = visited.has(path) ? 'return' : 'first';
    visited.add(path);
    images.beginStep();
    await page.evaluate(() => {
      const w = window as unknown as { __sjArmed?: boolean; __sjTapAt?: number };
      w.__sjTapAt = undefined;
      w.__sjArmed = true;
    });
    await page.locator(`a[href="${path}"]:visible`).first().tap();
    const ready = await page.evaluate(waitScreenReady, { path, cap: CAP_MS, fromNavigationStart: false });

    let frameChanges = 0;
    if (nav === 'return') {
      const before = await page.evaluate(captureFrameHeights);
      await page.waitForTimeout(STABILITY_WAIT_MS);
      const after = await page.evaluate(recheckFrameHeights);
      frameChanges = before.filter((h, i) => after[i] != null && Math.abs((after[i] as number) - h) > 1).length;
    }

    const budget = nav === 'return' ? RETURN_BUDGET_MS : FIRST_BUDGET_MS;
    const problems: string[] = [];
    if (ready.timed_out) problems.push(`not ready within ${CAP_MS} ms`);
    else if (ready.ready_ms > budget) problems.push(`ready ${ready.ready_ms} ms > ${budget} ms`);
    if (nav === 'return' && images.step.refetches.length) problems.push(`re-downloaded ${images.step.refetches.length} photo(s): ${images.step.refetches.slice(0, 3).join(', ')}`);
    if (frameChanges) problems.push(`${frameChanges} media frame(s) changed height`);

    rows.push({
      step: `${label} ${path}`,
      nav,
      ready_ms: ready.ready_ms,
      timed_out: ready.timed_out,
      img_total: ready.img_total,
      net_images: images.step.networkFetches.length,
      cache_hits: images.step.cacheHits,
      refetches: images.step.refetches.length,
      frame_changes: frameChanges,
      problems,
    });
  }

  console.log('[screen-journey] per-step summary (Pixel 7, 4x CPU, Fast 4G):');
  console.table(rows.map((r) => ({ ...r, problems: undefined, verdict: r.problems.length ? 'FAIL' : 'ok' })));
  for (const r of rows) if (r.problems.length) console.log(`[screen-journey] ${r.step}: ${r.problems.join('; ')}`);
  await test.info().attach('screen-journey.json', { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });

  const failures = rows.flatMap((r) => r.problems.map((p) => `${r.step} (${r.nav}): ${p}`));
  expect(failures, `screen journey budget failures:\n  ${failures.join('\n  ')}`).toEqual([]);
});
