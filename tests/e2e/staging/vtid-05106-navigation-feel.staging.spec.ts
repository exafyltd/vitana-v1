// VTID-05106 — Spotlight Phase 1b (navigation feel). With
// `future={{ v7_startTransition: true }}` the current screen stays while the
// next route's chunk loads, so after the first load a screen switch never
// shows the full-screen route-chunk loader (DelayedLoader source=route-chunk);
// a thin progress bar (data-testid=nav-progress) may show and is gone once the
// new screen is there. Desktop 1440x900, signed in, switching through the
// sidebar (hover first, then click — hover warms the chunk). Read-only:
// './staging-guard' aborts every write; only navigation links are clicked.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DESTINATIONS = ['/discover', '/comm', '/calendar', '/wallet', '/health', '/home'];

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

test('VTID-05106: desktop screen switches keep the current screen — no full-screen route loader after the first load', async ({ page, request }) => {
  test.setTimeout(150_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-loader-source="route-chunk"]')).toHaveCount(0, { timeout: 30_000 });

  // From here on, record every route-chunk loader that mounts.
  await page.evaluate(() => {
    const w = window as Window & { __routeLoaders?: string[] };
    w.__routeLoaders = [];
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes)
          if (n instanceof Element && (n.matches('[data-loader-source="route-chunk"]') || n.querySelector('[data-loader-source="route-chunk"]')))
            w.__routeLoaders!.push(location.pathname);
    }).observe(document.body, { childList: true, subtree: true });
  });

  const visited: string[] = [];
  for (const [i, path] of DESTINATIONS.entries()) {
    const link = sidebar.locator(`[data-sidebar="content"] a[href="${path}"]`).first();
    if ((await link.count()) === 0) continue;
    if (i % 2 === 0) {
      await link.hover();
      await page.waitForTimeout(250); // ≥ 80 ms dwell → intent prefetch
    }
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(\\?|$)`), { timeout: 20_000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('nav-progress')).toHaveCount(0, { timeout: 10_000 });
    visited.push(path);
  }

  expect(visited.length, `sidebar links found: ${visited.join(', ')}`).toBeGreaterThanOrEqual(3);
  const loaders = await page.evaluate(() => (window as Window & { __routeLoaders?: string[] }).__routeLoaders ?? []);
  expect(loaders, `full-screen route loader mounted during switches on: ${loaders.join(', ')}`).toEqual([]);
});
