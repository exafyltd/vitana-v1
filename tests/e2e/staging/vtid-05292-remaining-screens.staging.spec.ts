// desktop-spotlight-finish / remaining-screens: `/redeem`, `/tickets/demo`,
// `/tickets/success` and `/delete-account` on the Spotlight archetypes inside
// the app shell (owner decision 4, 2026-10-16).
// Read-only: './staging-guard' aborts every write. The spec signs in, navigates
// and reads the DOM. Nothing is submitted: no voucher is claimed (no voucher
// code in the URL), no purchase is verified (no purchase_id / session_id), and
// on /delete-account no button is clicked at all — the confirm step, the typed
// DELETE field and the final dialog are never reached.
//
// At 1440×900 with ?spotlight=1:
//   - the Vitanaland sidebar chrome is present (SR-01);
//   - the screen is framed with its archetype (`form` / `detail`);
//   - `detail` screens show exactly one spotlight VCard;
//   - no horizontal scroll.
// At 390×844: no `data-archetype` (phones keep today's layout) and no horizontal scroll.
import { test, expect } from './staging-guard';
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode|autopilot\/recommendations\/[^ ]+)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});
const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, query: '?spotlight=1' },
  { name: 'mobile', width: 390, height: 844, query: '' },
];
const SCREENS: { path: string; archetype: 'form' | 'detail'; ready: string }[] = [
  // No ?voucher= → the "invalid link" state; nothing is looked up or claimed.
  { path: '/redeem', archetype: 'form', ready: 'h1' },
  { path: '/tickets/demo', archetype: 'detail', ready: 'h1, h2' },
  // No ?purchase_id= → the "invalid request" state; the payment update never runs.
  { path: '/tickets/success', archetype: 'detail', ready: 'h1' },
  // Only the first (info) step renders; no button on it is clicked.
  { path: '/delete-account', archetype: 'form', ready: 'button' },
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
for (const vp of VIEWPORTS) {
  for (const screen of SCREENS) {
    test(`remaining-screens: ${screen.path} at ${vp.width}px`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await page.goto(`${screen.path}${vp.query}`, { waitUntil: 'domcontentloaded' });
      if (vp.name === 'desktop') {
        const frame = page.locator(`[data-archetype="${screen.archetype}"]`);
        await expect(frame).toHaveCount(1, { timeout: 30_000 });
        await expect(frame.locator(screen.ready).first()).toBeVisible({ timeout: 30_000 });
        const sidebar = page.locator('[data-sidebar="sidebar"]').first();
        await expect(sidebar).toBeVisible();
        await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();
        if (screen.archetype === 'detail') {
          await expect(frame.locator('[data-vcard-size="spotlight"]')).toHaveCount(1);
        }
      } else {
        await expect(page.locator(screen.ready).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.locator('[data-archetype]')).toHaveCount(0);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
    });
  }
}
