// VTID-05109 — Spotlight Phase 3: Discover storefront. Desktop, signed in,
// Spotlight forced on with ?spotlight=1 (flag-off run with ?spotlight=0).
// Read-only: './staging-guard' aborts every write. The test only navigates,
// types into the search pill (GET /api/v1/discover/search), opens and closes
// the quick-view sheet. It never clicks cart, Recommend, Share or Buy.
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

async function openStorefront(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/discover?spotlight=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-archetype="storefront"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });
}

const overflow = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test('VTID-05109: storefront — one hero spotlight, shelves of standard cards, no Overview SplitBar', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openStorefront(page, request, 1440);

  // SubNavigation kept; the Overview SplitBar (Suggested / Categories / Share & Earn) is gone.
  await expect(page.locator('a[href="/discover/supplements"]').first()).toBeVisible();
  await expect(page.locator('[data-archetype="storefront"] [role="tablist"]')).toHaveCount(0);

  const hero = page.locator('[data-storefront-hero]');
  await expect(hero).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-vcard-skeleton]')).toHaveCount(0, { timeout: 30_000 });
  expect(await page.locator('[data-vcard-size="spotlight"]').count(), 'exactly one spotlight card').toBe(1);

  const shelfCards = page.locator('[data-discover-shelf] [data-vcard-size="standard"]');
  await expect(shelfCards.first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('[data-discover-shelf="share"]').count()).toBe(1);
});

test('VTID-05109: the overview search returns real results (typing only)', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openStorefront(page, request, 1440);
  const utility = page.locator('[data-spotlight-utility]');
  await utility.locator('button').filter({ hasText: /Suchen|Search/ }).first().click();
  const input = utility.locator('input').first();
  await expect(input).toBeVisible();
  await input.pressSequentially('vitamin', { delay: 40 });

  const results = page.locator('[data-discover-results]');
  await expect(results).toBeVisible({ timeout: 20_000 });
  await expect(results.locator('[data-product-id]').first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('[data-vcard-size="spotlight"]').count(), 'the top result is the one hero').toBe(1);

  await input.press('Escape');
  await expect(results).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-storefront-hero]')).toBeVisible({ timeout: 20_000 });
});

test('VTID-05109: a product opens the quick-view sheet with "Open full page", and it closes', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openStorefront(page, request, 1440);
  const card = page.locator('[data-discover-shelf] [data-product-id]').first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.locator('button').first().click();

  const sheet = page.locator('[data-discover-quick-view]');
  await expect(sheet).toBeVisible({ timeout: 10_000 });
  await expect(sheet.locator('a[href^="/discover/product/"]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0, { timeout: 10_000 });
});

for (const width of [1280, 1440]) {
  test(`VTID-05109: no horizontal scroll at ${width}px, LTR and RTL`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await openStorefront(page, request, width);
    await expect(page.locator('[data-vcard-skeleton]')).toHaveCount(0, { timeout: 30_000 });
    expect(await overflow(page), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    await page.waitForTimeout(300);
    expect(await overflow(page), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
  });
}

test('VTID-05109: flag off — /discover is the legacy screen with its Overview SplitBar', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/discover?spotlight=0', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main [role="tablist"]').first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('main [role="tablist"] [role="tab"]').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-archetype]')).toHaveCount(0);
  await expect(page.locator('[data-discover-storefront]')).toHaveCount(0);
});
