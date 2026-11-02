// desktop-spotlight-finish / public-profile: `/u/:identifier` and `/me/profile`
// on the Spotlight `detail` archetype (owner decision 4, 2026-10-16).
// Read-only: './staging-guard' aborts every write and nothing that writes is
// clicked (no follow, like, message or edit) — the spec signs in, navigates and
// reads the DOM. The test user's handle is read with one GET on `profiles`.
//
// At 1440×900 with ?spotlight=1:
//   - the Vitanaland sidebar chrome is present (SR-01);
//   - the screen is framed as `data-archetype="detail"`;
//   - exactly one spotlight VCard (the profile ID card) in the stage;
//   - the stats sit in the context rail as compact VCards;
//   - no horizontal scroll.
// At 390×844: no `data-archetype` (phones keep today's layout) and no horizontal scroll.
import { test, expect } from './staging-guard';
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode|autopilot\/recommendations\/[^ ]+)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches|profile_views)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});
const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const TEST_USER_ID = 'a27552a3-0257-4305-8ed0-351a80fd3701';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, query: '?spotlight=1' },
  { name: 'mobile', width: 390, height: 844, query: '' },
];
type Session = { access_token: string };
async function signIn(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext): Promise<{ key: string; session: Session }> {
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
  return { key: key!, session };
}
async function testUserHandle(request: import('@playwright/test').APIRequestContext, key: string, session: Session): Promise<string> {
  const rows = await (
    await request.get(`${SUPABASE}/rest/v1/profiles?user_id=eq.${TEST_USER_ID}&select=handle`, {
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
    })
  ).json();
  const handle = Array.isArray(rows) ? rows[0]?.handle : null;
  expect(handle, 'test user has no handle').toBeTruthy();
  return String(handle).replace(/^@/, '');
}
for (const vp of VIEWPORTS) {
  for (const which of ['public', 'own'] as const) {
    test(`public-profile: ${which === 'public' ? '/u/:identifier' : '/me/profile'} at ${vp.width}px`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const { key, session } = await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      const path = which === 'public' ? `/u/${await testUserHandle(request, key, session)}` : '/me/profile';
      // /u/:identifier treats a not-yet-signed-in viewer as a shared link
      // (immersive landing, no ID card). The token is seeded into localStorage
      // but the auth context hydrates async. Visit the auth-gated /me/profile
      // first and wait for its ID card: that proves the session is live, so the
      // following /u/ render takes the signed-in branch — a real signed-in
      // visit, never the shared-link landing.
      if (which === 'public') {
        await page.goto('/me/profile', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-testid="profile-id-card"], [data-testid="profile-vitana-index-card"]').first()).toBeVisible({ timeout: 30_000 });
      }
      await page.goto(`${path}${vp.query}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-testid="profile-id-card"], [data-testid="profile-vitana-index-card"]').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 30_000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
      if (vp.name === 'desktop') {
        const sidebar = page.locator('[data-sidebar="sidebar"]').first();
        await expect(sidebar).toBeVisible();
        const frame = page.locator('[data-archetype="detail"]');
        await expect(frame).toHaveCount(1);
        await expect(frame.locator('[data-vcard-size="spotlight"]')).toHaveCount(1);
        await expect(frame.locator('[data-vcard-size="spotlight"] [data-testid="profile-id-card"]')).toHaveCount(1);
        await expect(frame.locator('[data-spotlight-rail] [data-profile-stat]')).toHaveCount(5);
      } else {
        await expect(page.locator('[data-archetype]')).toHaveCount(0);
      }
    });
  }
}
