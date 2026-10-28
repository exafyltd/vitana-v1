// desktop-spotlight-finish / commerce-shell: on desktop Spotlight a signed-in
// member on the app host sees the Commerce Portal and the video shop inside the
// app shell (sidebar + ORB stay); a guest keeps the standalone portal.
// Read-only: './staging-guard' aborts every write and nothing that writes is
// clicked — the spec signs in, navigates and reads the DOM.
//
//   - signed in, 1440 ?spotlight=1: /shop and /commerce show the Vitanaland
//     sidebar and a ScreenFrame ([data-archetype]); no horizontal scroll;
//   - signed out, 1440 ?spotlight=1: /commerce shows the guest landing in the
//     standalone portal (no sidebar).
import { test, expect } from './staging-guard';
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode|autopilot\/recommendations\/[^ ]+|shop\/[^ ]*events[^ ]*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});
const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ROUTES = [
  { path: '/shop', archetype: 'immersive' },
  { path: '/commerce', archetype: 'collection' },
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
}

for (const route of ROUTES) {
  test(`commerce-shell: signed-in ${route.path} sits in the app shell at 1440px (Spotlight)`, async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${route.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await expect(sidebar, 'Vitanaland sidebar').toBeVisible({ timeout: 30_000 });
    await expect(page.locator(`[data-archetype="${route.archetype}"]`).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-commerce-main]'), 'no standalone portal shell').toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
  });
}

test('commerce-shell: signed-out /commerce keeps the standalone guest portal at 1440px (Spotlight)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/commerce?spotlight=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('commerce-guest-landing')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-commerce-main]')).toHaveCount(1);
  await expect(page.locator('[data-sidebar="sidebar"]')).toHaveCount(0);
});
