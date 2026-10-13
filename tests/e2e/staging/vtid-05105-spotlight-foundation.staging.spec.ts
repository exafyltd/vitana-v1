// VTID-05105 — Spotlight Phase 1a (design foundation) changes nothing a member
// sees while the desktop_spotlight flag is off: News and Discover still render
// today's large desktop header, no screen is framed by ScreenFrame yet, and
// the Vitanaland sidebar chrome (shortcut bar, global search, nav, footer with
// profile / Soundscape / Language) is intact. Read-only: './staging-guard'
// aborts every write; nothing is clicked. Desktop viewport 1440x900.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
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
    localStorage.removeItem('vitana.spotlight');
  }, session);
}

for (const route of ['/home', '/discover']) {
  test(`VTID-05105: ${route} on desktop is unchanged with Spotlight off and keeps the Vitanaland sidebar chrome`, async ({ page, request }) => {
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    // Today's large desktop StandardHeader (text-3xl h1) is still the header.
    await expect(page.locator('main h1.text-3xl').first()).toBeVisible({ timeout: 25_000 });
    // No screen is framed by Spotlight yet, and no compact header leaked in.
    await expect(page.locator('[data-archetype]')).toHaveCount(0);
    await expect(page.locator('[data-header-density="compact"]')).toHaveCount(0);

    // Sidebar chrome: header (shortcut bar + global search), nav items, footer.
    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
    expect(await sidebar.locator('[data-sidebar="header"] button').count()).toBeGreaterThanOrEqual(5);
    expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
    const footer = sidebar.locator('[data-sidebar="footer"]');
    await expect(footer).toBeVisible();
    expect(await footer.locator('button').count()).toBeGreaterThanOrEqual(3);
  });
}
