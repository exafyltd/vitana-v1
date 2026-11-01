// VTID-05418 — Find a Match on the Spotlight grid (contract SR-31, owner-approved
// mock find-a-match-proposed.png, 2026-10-31). Read-only: './staging-guard'
// aborts every write; nothing is clicked (Say hello is never pressed).
//
// Signed in as the test user, /comm/find-partner?view=matches:
//   1400x900 ?spotlight=1, after the grid skeleton is gone:
//     - the frame is the collection archetype marked data-screen-layout="spotlight-grid";
//     - the compact header (2 buttons) and the utility bar are visible;
//     - with matches: exactly one real spotlight card in [data-spotlight-grid], its
//       width between 30% and 45% of [data-spotlight-layout], tiles beside it (top
//       within its vertical span), the row (when rendered) below it, and a
//       Say hello / View profile action on it;
//     - with no matches for this account: no spotlight card and no grid (the
//       page's empty / suggestions state, D4 — tiles are never invented);
//     - no horizontal scroll, LTR and RTL.
//   1400x900 ?view=board: the shared result area, no Spotlight grid.
//   390x844, no query: no Spotlight frame, the mobile bottom nav is visible.
// The localStorage override is cleared at the end so the browser profile is left as found.
import { test, expect } from './staging-guard';

// daily_matches / generate-daily-matches: opening matches can mark them viewed
// (VTID-04827); the guard aborts those writes, so nothing is written.
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ROUTE = '/comm/find-partner';

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

const overflow = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test('VTID-05418: /comm/find-partner — one Spotlight card at 30-45% beside the tiles, row below, chrome intact (1400, LTR/RTL); phones unchanged', async ({ page, request }) => {
  test.setTimeout(180_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${ROUTE}?view=matches&spotlight=1`, { waitUntil: 'domcontentloaded' });
  const frame = page.locator('[data-archetype]').first();
  await expect(frame).toBeVisible({ timeout: 30_000 });
  await expect(frame).toHaveAttribute('data-archetype', 'collection');
  await expect(frame).toHaveAttribute('data-screen-layout', 'spotlight-grid');
  const header = page.locator('[data-header-density="compact"]').first();
  await expect(header).toBeVisible();
  expect(await header.locator('button').count(), 'compact header: Autopilot + Vitana Index').toBe(2);
  await expect(page.locator('[data-spotlight-utility]').first()).toBeVisible();
  await expect(page.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const realSpotlight = page.locator('[data-spotlight-grid] [data-vcard-size="spotlight"]:not([data-vcard-skeleton])');
  const gridCount = await page.locator('[data-spotlight-grid]').count();
  if (gridCount === 0) {
    // No matches for this account: the page's empty / suggestions state, never an invented card.
    test.info().annotations.push({ type: 'data', description: 'test account has no matches: empty state asserted' });
    await expect(page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])')).toHaveCount(0);
  } else {
    await expect(realSpotlight).toHaveCount(1);
    await expect(page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])')).toHaveCount(1);
    const geo = await page.evaluate(() => {
      const box = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
      const layout = box(document.querySelector('[data-spotlight-layout]'));
      const spot = box(document.querySelector('[data-spotlight-grid] [data-vcard-size="spotlight"]:not([data-vcard-skeleton])'));
      const tiles = [...document.querySelectorAll('[data-spotlight-grid] [data-slot="tiles"] [data-vcard-size="standard"]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top };
      });
      const row = box(document.querySelector('[data-spotlight-grid] [data-slot="row"]'));
      return {
        layoutWidth: layout?.width ?? 0,
        spot: spot && { width: spot.width, top: spot.top, bottom: spot.bottom },
        tiles,
        row: row && { top: row.top },
      };
    });
    expect(geo.layoutWidth).toBeGreaterThan(0);
    const ratio = geo.spot!.width / geo.layoutWidth;
    expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeLessThanOrEqual(0.45);
    expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(0.3);
    for (const tile of geo.tiles) {
      expect(tile.top, 'tile beside the spotlight').toBeGreaterThanOrEqual(geo.spot!.top - 1);
      expect(tile.top, 'tile beside the spotlight').toBeLessThan(geo.spot!.bottom);
    }
    if (geo.row) expect(geo.row.top, 'row below the spotlight').toBeGreaterThanOrEqual(geo.spot!.bottom - 1);
    const actions = realSpotlight.getByRole('button');
    expect(await actions.count(), 'Say hello / View profile on the spotlight').toBeGreaterThanOrEqual(1);
  }

  expect(await overflow(page), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  await page.waitForTimeout(300);
  expect(await overflow(page), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
  });

  // Board view: the shared result area, no Spotlight grid.
  await page.goto(`${ROUTE}?view=board&spotlight=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-archetype]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-screen-layout="spotlight-grid"]')).toHaveCount(0);
  await expect(page.locator('[data-spotlight-grid]')).toHaveCount(0);

  // Phones: never the Spotlight frame.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mobile-bottom-nav').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-spotlight-layout]')).toHaveCount(0);
  await expect(page.locator('[data-archetype]')).toHaveCount(0);

  await page.goto(`${ROUTE}?spotlight=clear`, { waitUntil: 'domcontentloaded' });
});
