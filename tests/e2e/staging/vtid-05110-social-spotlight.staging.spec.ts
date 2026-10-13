// VTID-05110 — Spotlight Phase 4 (social screens). With Spotlight forced on
// (?spotlight=1) on a desktop viewport, Community overview, Events & Meetups,
// Groups and Live Rooms are framed by ScreenFrame with their manifest
// archetype, the Vitanaland sidebar chrome is intact, a dominant archetype
// shows exactly one spotlight card (others at most one), and there is no
// horizontal scroll in LTR or RTL at 1280 and 1440 px. With ?spotlight=0 the
// same routes render today's screen (no ScreenFrame). Group detail is reached
// by following the first group link (navigation only).
//
// Read-only: './staging-guard' aborts every write; the only clicks are
// navigation links. No join / notify / create / like is ever pressed.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SINGLE = new Set(['focus-feed', 'storefront', 'detail', 'dashboard']);
const ROUTES: { path: string; archetype: string }[] = [
  { path: '/comm', archetype: 'collection' },
  { path: '/comm/events-meetups', archetype: 'collection' },
  { path: '/comm/groups', archetype: 'collection' },
  { path: '/comm/live-rooms', archetype: 'focus-feed' },
];

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

async function expectSidebarChrome(page: import('@playwright/test').Page) {
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
  expect(await sidebar.locator('[data-sidebar="header"] button').count()).toBeGreaterThanOrEqual(5);
  expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
  const footer = sidebar.locator('[data-sidebar="footer"]');
  await expect(footer).toBeVisible();
  expect(await footer.locator('button').count()).toBeGreaterThanOrEqual(3);
}

async function expectSpotlightContract(page: import('@playwright/test').Page, archetype: string) {
  const frame = page.locator('[data-archetype]').first();
  await expect(frame).toBeVisible({ timeout: 25_000 });
  await expect(frame).toHaveAttribute('data-archetype', archetype);
  await expect(page.locator('[data-header-density="compact"]').first()).toBeVisible();
  await expectSidebarChrome(page);

  // Wait for the archetype skeletons to resolve before counting cards.
  await expect(page.locator('[data-social-skeleton], [data-archetype-skeleton]')).toHaveCount(0, { timeout: 25_000 });
  const spotlightCards = page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])');
  if (SINGLE.has(archetype)) {
    await expect(spotlightCards).toHaveCount(1, { timeout: 20_000 });
  } else {
    expect(await spotlightCards.count(), 'at most one spotlight card').toBeLessThanOrEqual(1);
  }
  // Rails hold only compact / row cards (SR-08).
  expect(await page.locator('[data-spotlight-rail] [data-vcard-size="spotlight"], [data-spotlight-rail] [data-vcard-size="standard"]').count()).toBe(0);

  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  await page.waitForTimeout(300);
  expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
  });
}

for (const route of ROUTES) {
  for (const width of [1280, 1440]) {
    test(`VTID-05110: ${route.path} with Spotlight on at ${width}px is a ${route.archetype} screen with the sidebar chrome intact`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, request);
      await page.goto(`${route.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      await expectSpotlightContract(page, route.archetype);
    });
  }

  test(`VTID-05110: ${route.path} with Spotlight off renders today's screen (no ScreenFrame)`, async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    await page.goto(`${route.path}?spotlight=0`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-archetype]')).toHaveCount(0);
    await expectSidebarChrome(page);
  });
}

test('VTID-05110: group detail (via the first group link) is a detail screen with one spotlight card', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, request);
  await page.goto('/comm/groups?tab=recommended&spotlight=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-archetype="collection"]').first()).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-social-skeleton]')).toHaveCount(0, { timeout: 25_000 });
  const link = page.locator('[data-archetype] a[href^="/comm/groups/"]').first();
  test.skip((await link.count()) === 0, 'no group listed for this account on staging');
  await link.click(); // navigation only
  await expect(page).toHaveURL(/\/comm\/groups\/[^/?]+/, { timeout: 20_000 });
  await expectSpotlightContract(page, 'detail');
});
