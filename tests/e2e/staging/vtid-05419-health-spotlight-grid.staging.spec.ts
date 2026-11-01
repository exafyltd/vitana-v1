// VTID-05419 — /health on the Spotlight grid (contract SR-31, plan spotlight-card-proportion).
// Read-only: './staging-guard' aborts every write; nothing but navigation happens here
// (no clicks on any control, Ask Vitana and the Autopilot are never opened).
//
// Signed in as the test user:
//   1400x900 and 1920x1080, ?spotlight=1, once the grid skeleton is gone:
//     - the frame opts into the grid (data-screen-layout="spotlight-grid");
//     - exactly 1 non-skeleton spotlight card inside [data-spotlight-grid], the Vitana Index,
//       carrying its Spotlight label, at >= 30 % and <= 45 % of the [data-spotlight-layout] width;
//     - six standard tiles, each beside the spotlight (its top within the spotlight's vertical span,
//       on its inline-end side);
//     - the "Up next" row, when the account has Autopilot actions, starts below the spotlight;
//     - the compact header with its 2 buttons and the utility bar are visible;
//     - no horizontal scroll (LTR and dir="rtl").
//   390x844, no query: no Spotlight frame, the mobile bottom nav is visible.
// Thin test-account data only changes what is inside the slots, never these structural checks.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
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
}

const SPOT = '[data-spotlight-grid] [data-slot="spotlight"] [data-vcard-size="spotlight"]:not([data-vcard-skeleton])';

test('VTID-05419: /health — one Vitana Index Spotlight card at ~40 %, six tiles beside it, row below (1400/1920, LTR/RTL)', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  for (const [width, height] of [
    [1400, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/health?spotlight=1', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-archetype="dashboard"][data-screen-layout="spotlight-grid"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator(SPOT)).toHaveCount(1, { timeout: 20_000 });
    await expect(page.locator(`${SPOT}[data-testid="spotlight-vitana-index-hero"] [data-vcard-spotlight-label]`)).toBeVisible();

    const m = await page.evaluate((spotSel) => {
      const layout = document.querySelector('[data-spotlight-layout]')!.getBoundingClientRect();
      const spot = document.querySelector(spotSel)!.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('[data-spotlight-grid] [data-slot="tiles"] [data-vcard-size="standard"]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, right: r.right };
      });
      const rowEl = document.querySelector('[data-spotlight-grid] [data-slot="row"]');
      const row = rowEl ? rowEl.getBoundingClientRect().top : null;
      return {
        share: spot.width / layout.width,
        spot: { top: spot.top, bottom: spot.bottom, left: spot.left, right: spot.right },
        tiles,
        row,
        rtl: getComputedStyle(document.documentElement).direction === 'rtl',
      };
    }, SPOT);

    expect(m.share, `spotlight share of the layout width at ${width}px`).toBeGreaterThanOrEqual(0.3);
    expect(m.share, `spotlight share of the layout width at ${width}px`).toBeLessThanOrEqual(0.45);
    expect(m.tiles.length, 'six standard tiles').toBe(6);
    for (const tile of m.tiles) {
      expect(tile.top, 'tile beside the spotlight (vertical span)').toBeGreaterThanOrEqual(m.spot.top - 1);
      expect(tile.top, 'tile beside the spotlight (vertical span)').toBeLessThan(m.spot.bottom);
      if (m.rtl) expect(tile.right, 'tile on the inline-end side').toBeLessThanOrEqual(m.spot.left + 1);
      else expect(tile.left, 'tile on the inline-end side').toBeGreaterThanOrEqual(m.spot.right - 1);
    }
    if (m.row !== null) expect(m.row, 'Up next row below the spotlight').toBeGreaterThanOrEqual(m.spot.bottom - 1);

    const header = page.locator('[data-header-density="compact"]').first();
    await expect(header).toBeVisible();
    expect(await header.locator('button').count(), 'compact header buttons').toBe(2);
    await expect(page.locator('[data-spotlight-utility]').first()).toBeVisible();

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(await overflow(), `horizontal scroll (LTR, ${width}px)`).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    await page.waitForTimeout(300);
    expect(await overflow(), `horizontal scroll (RTL, ${width}px)`).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'ltr';
    });
  }

  // Phone: unchanged, no Spotlight frame.
  await page.goto('/health?spotlight=clear', { waitUntil: 'domcontentloaded' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/health', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mobile-bottom-nav').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-spotlight-layout]')).toHaveCount(0);
  await expect(page.locator('[data-archetype]')).toHaveCount(0);
});
