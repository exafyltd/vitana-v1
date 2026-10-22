// desktop-spotlight-finish / skeletons (owner decision 3, 2026-10-16): data-loading
// page spinners became archetype skeletons on desktop Spotlight and on phones.
// Read-only: './staging-guard' aborts every write and nothing that writes is
// clicked — the spec signs in, navigates and reads the DOM.
//
// For /messages (→ /inbox) and /my-tickets, at 1400×900 with ?spotlight=1 and at
// 390×844, with every GET to the gateway and Supabase REST delayed ~1.5 s so the
// loading state is observable:
//   - the skeleton ([data-archetype-skeleton]) is visible while loading;
//   - no `.animate-spin` outside a button while loading (no page spinner);
//   - at 390 the top app bar and the bottom nav stay visible while loading on
//     /messages (/my-tickets has no app shell on phones, on main too: its page
//     header stays instead);
//   - cumulative layout shift until the content settles is < 0.1.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode|autopilot\/recommendations\/[^ ]+)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ROUTES = ['/messages', '/my-tickets'];
const VIEWPORTS = [
  { name: 'desktop', width: 1400, height: 900, query: '?spotlight=1' },
  { name: 'mobile', width: 390, height: 844, query: '' },
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
  for (const vp of VIEWPORTS) {
    test(`skeletons: ${route} shows the skeleton, no page spinner and no layout shift at ${vp.width}px`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      // Delay data GETs only (never a write), then let them through unchanged.
      await page.route(/(preview-aws-gateway\.vitanaland\.com\/api\/|supabase\.co\/rest\/v1\/)/, async (r) => {
        if (r.request().method() === 'GET') await new Promise((res) => setTimeout(res, 1500));
        await r.fallback();
      });
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
            if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto(`${route}${vp.query}`, { waitUntil: 'domcontentloaded' });

      const skeleton = page.locator('[data-archetype-skeleton]').first();
      await expect(skeleton).toBeVisible({ timeout: 25_000 });
      const spinners = await page.evaluate(
        () => [...document.querySelectorAll('.animate-spin')].filter((el) => !el.closest('button') && (el as HTMLElement).offsetParent !== null).length,
      );
      expect(spinners, 'page-level spinner while loading').toBe(0);
      if (vp.name === 'mobile' && route === '/messages') {
        await expect(page.locator('header.fixed').first(), 'top app bar while loading').toBeVisible();
        await expect(page.locator('.mobile-bottom-nav').first(), 'bottom nav while loading').toBeVisible();
      }
      if (vp.name === 'mobile' && route === '/my-tickets') {
        // /my-tickets renders without AppLayout on phones (no app bar / bottom nav on
        // main either); its own page header is the chrome that must stay mounted.
        await expect(page.locator('h1').first(), 'page header while loading').toBeVisible();
      }

      await expect(page.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 30_000 });
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, 'cumulative layout shift until the content settled').toBeLessThan(0.1);
    });
  }
}
