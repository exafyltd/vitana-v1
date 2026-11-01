// VTID-05416 — plan spotlight-card-proportion, lane discover (contract SR-31, owner-approved layout 2026-10-31).
// /discover overview on desktop Spotlight (?spotlight=1): ONE Spotlight card at ~40% of the content width, the
// standard tiles beside it, the "Browse categories" compact row below, the compact header and the utility bar kept,
// no horizontal scroll. Phones (390x844, no query) keep the mobile screen.
// Read-only: './staging-guard' aborts every write. The test only signs in (Supabase REST) and navigates; it never
// clicks cart, Recommend, Share or Buy. Thin test-account data only changes counts inside the slots, never the width
// or the one-spotlight assertions.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
type Page = import('@playwright/test').Page;
type Request = import('@playwright/test').APIRequestContext;

async function signIn(page: Page, request: Request) {
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

const SPOTLIGHT = '[data-spotlight-grid] [data-vcard-size="spotlight"]:not([data-vcard-skeleton])';

async function openGrid(page: Page, request: Request, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/discover?spotlight=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-archetype="storefront"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('[data-vcard-skeleton]')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator(SPOTLIGHT)).toBeVisible({ timeout: 30_000 });
}

for (const [width, height] of [
  [1400, 900],
  [1920, 1080],
] as const) {
  test(`VTID-05416: /discover at ${width}x${height} — one Spotlight card at ~40%, tiles beside it, categories row below`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await openGrid(page, request, width, height);

    // The frame opted into the Spotlight grid layout (width `full`).
    await expect(page.locator('[data-screen-layout="spotlight-grid"]')).toHaveCount(1);

    // Exactly one Spotlight card, with its label, at 30-45% of the content width.
    expect(await page.locator(SPOTLIGHT).count(), 'exactly one spotlight card').toBe(1);
    expect(await page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])').count(), 'no other spotlight card').toBe(1);
    const spot = page.locator(SPOTLIGHT);
    await expect(spot.locator('[data-vcard-spotlight-label]')).toBeVisible();
    const layout = await page.locator('[data-spotlight-layout]').first().boundingBox();
    const sBox = await spot.boundingBox();
    expect(layout && sBox, 'layout and spotlight boxes').toBeTruthy();
    const ratio = sBox!.width / layout!.width;
    expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeLessThanOrEqual(0.45);
    expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(0.3);

    // Tiles sit beside the spotlight: their tops fall within the spotlight's vertical span.
    const tiles = page.locator('[data-spotlight-grid] [data-slot="tiles"] [data-vcard-size="standard"]');
    const tileCount = await tiles.count();
    for (let i = 0; i < tileCount; i++) {
      const b = await tiles.nth(i).boundingBox();
      expect(b, `tile ${i} box`).toBeTruthy();
      expect(b!.y, `tile ${i} starts within the spotlight's span`).toBeGreaterThanOrEqual(sBox!.y - 1);
      expect(b!.y, `tile ${i} starts within the spotlight's span`).toBeLessThan(sBox!.y + sBox!.height);
    }

    // The "Browse categories" row is rendered (static links) below the spotlight, compact cards only.
    const row = page.locator('[data-spotlight-grid] [data-slot="row"]');
    await expect(row).toBeVisible();
    const rBox = await row.boundingBox();
    expect(rBox!.y, 'row starts below the spotlight').toBeGreaterThanOrEqual(sBox!.y + sBox!.height - 1);
    expect(await row.locator('[data-vcard-size="compact"]').count()).toBe(5);
    expect(await row.locator('[data-vcard-size]:not([data-vcard-size="compact"])').count()).toBe(0);
    await expect(row.locator('a[href="/discover/supplements"]')).toBeVisible();

    // Chrome unchanged: compact header with its 2 cards, utility bar visible.
    const header = page.locator('[data-header-density="compact"]');
    await expect(header).toBeVisible();
    expect(await header.locator(':scope > button').count(), 'header keeps the Autopilot and Vitana Index cards').toBe(2);
    await expect(page.locator('[data-spotlight-utility]')).toBeVisible();

    // No horizontal scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'horizontal scroll').toBeLessThanOrEqual(1);
  });
}

test('VTID-05416: phone 390x844 (no query) — no Spotlight frame, the mobile nav is visible', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/discover', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mobile-bottom-nav').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-spotlight-layout]')).toHaveCount(0);
  await expect(page.locator('[data-archetype]')).toHaveCount(0);
  await expect(page.locator('[data-spotlight-grid]')).toHaveCount(0);
});
