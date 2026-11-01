// VTID-05417 — Community > Events & MeetUps on the SR-31 Spotlight grid
// (plan spotlight-card-proportion, owner-approved layout 2026-10-31). At
// 1400x900 with Spotlight forced on (?spotlight=1) the next event is the one
// Spotlight card at ~40% of the layout width, "This week" tiles sit beside it,
// the "Upcoming" row (when rendered) is below it, and the chrome is unchanged.
// At 390x844 (phone) the screen is not framed by Spotlight.
//
// Read-only: './staging-guard' aborts every write. Nothing is clicked — Join,
// Details, Create are never pressed.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ROUTE = '/comm/events-meetups';

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
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

test('VTID-05417: Events & MeetUps at 1400x900 — one Spotlight card at ~40%, tiles beside it, row below, chrome unchanged', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await signIn(page, request);
  await page.goto(`${ROUTE}?spotlight=1`, { waitUntil: 'domcontentloaded' });

  const frame = page.locator('[data-archetype="collection"]').first();
  await expect(frame).toBeVisible({ timeout: 25_000 });
  await expect(frame).toHaveAttribute('data-screen-layout', 'spotlight-grid');
  await expect(page.locator('[data-archetype-skeleton], [data-social-skeleton]')).toHaveCount(0, { timeout: 30_000 });
  test.skip((await page.locator('[data-social-empty]').count()) > 0, 'no events listed for this account on staging');

  const spotlight = page.locator('[data-spotlight-grid] [data-vcard-size="spotlight"]:not([data-vcard-skeleton])');
  await expect(spotlight).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])')).toHaveCount(1);
  await expect(spotlight.locator('[data-vcard-spotlight-label]')).toHaveCount(1);

  const layoutBox = await page.locator('[data-spotlight-layout]').first().boundingBox();
  const spotBox = await spotlight.boundingBox();
  expect(layoutBox && spotBox, 'layout and spotlight boxes').toBeTruthy();
  const ratio = spotBox!.width / layoutBox!.width;
  expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeLessThanOrEqual(0.45);
  expect(ratio, `spotlight width ratio ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(0.3);

  // Tiles sit beside the spotlight: each tile's top lies within the spotlight's vertical span.
  const tiles = page.locator('[data-spotlight-grid] [data-slot="tiles"] [data-vcard-size="standard"]');
  const tileCount = await tiles.count();
  expect(tileCount, 'at most six tiles').toBeLessThanOrEqual(6);
  for (let i = 0; i < tileCount; i += 1) {
    const box = await tiles.nth(i).boundingBox();
    expect(box!.y, `tile ${i} top within the spotlight span`).toBeGreaterThanOrEqual(spotBox!.y - 1);
    expect(box!.y, `tile ${i} top within the spotlight span`).toBeLessThan(spotBox!.y + spotBox!.height);
  }

  const row = page.locator('[data-spotlight-grid] [data-slot="row"]');
  if ((await row.count()) > 0) {
    const rowBox = await row.first().boundingBox();
    expect(rowBox!.y, 'row below the spotlight').toBeGreaterThanOrEqual(spotBox!.y + spotBox!.height - 1);
  }

  const header = page.locator('[data-header-density="compact"]').first();
  await expect(header).toBeVisible();
  await expect(header.locator(':scope > button')).toHaveCount(2);
  await expect(page.locator('[data-spotlight-utility]').first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
});

test('VTID-05417: Events & MeetUps at 390x844 (phone) is not framed by Spotlight', async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mobile-bottom-nav').first()).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-spotlight-layout]')).toHaveCount(0);
  await expect(page.locator('[data-archetype]')).toHaveCount(0);
});
