// VTID-05117 — Spotlight Phase 7.5 (part A): the remaining member screens on
// the Spotlight contract. Read-only: './staging-guard' aborts every write and
// nothing that writes is clicked — the spec only navigates and reads the DOM.
//
// For every static route this phase migrated, signed in, with Spotlight forced
// on (?spotlight=1) at 1280 and 1440 px:
//   - the screen is framed by ScreenFrame with the manifest's archetype (SR-03);
//   - the Vitanaland sidebar chrome is intact (SR-01): global search, nav
//     items, footer controls;
//   - after the screen settled there is no page spinner — no DelayedLoader and
//     no `animate-spin` outside a button (SR-20);
//   - dashboard / storefront / detail show exactly ONE spotlight card in the
//     first viewport (SR-06);
//   - no horizontal scroll, LTR and with dir="rtl" (SR-19).
// Role-gated /patient/* screens (ProtectedRoute requiredRole="patient") are
// covered by the Vitest suite only; /patient/results is AuthGuard-only and runs
// here. /memory/diary is left out: opening it completes an onboarding step (a
// write the guard would abort); its frame is pinned by Vitest.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode|autopilot\/recommendations\/[^ ]+)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SINGLE = new Set(['focus-feed', 'storefront', 'detail', 'dashboard']);

// path → archetype(s) the page may legitimately frame itself with.
const ROUTES: { path: string; archetypes: string[] }[] = [
  { path: '/memory', archetypes: ['collection'] },
  { path: '/memory/timeline', archetypes: ['collection'] },
  { path: '/memory/recall', archetypes: ['collection'] },
  { path: '/memory/permissions', archetypes: ['collection'] },
  { path: '/settings/privacy', archetypes: ['form'] },
  { path: '/settings/preferences', archetypes: ['form'] },
  { path: '/autopilot', archetypes: ['dashboard'] },
  { path: '/business', archetypes: ['storefront'] },
  { path: '/business/services', archetypes: ['collection'] },
  { path: '/business/clients', archetypes: ['collection'] },
  { path: '/business/analytics', archetypes: ['collection'] },
  // Without reseller access Sell & Earn falls back to the overview (legacy tab logic) → storefront.
  { path: '/business/sell-earn', archetypes: ['collection', 'storefront'] },
  { path: '/business/opportunities', archetypes: ['collection'] },
  { path: '/business/listings', archetypes: ['collection'] },
  { path: '/discover/ai-picks', archetypes: ['collection'] },
  { path: '/discover/marketplace', archetypes: ['collection'] },
  { path: '/discover/category/longevity', archetypes: ['collection'] },
  { path: '/discover/provider/1', archetypes: ['detail'] },
  { path: '/inbox/archived', archetypes: ['conversation'] },
  { path: '/inbox/inspiration', archetypes: ['conversation'] },
  { path: '/search', archetypes: ['collection'] },
  { path: '/comm/members', archetypes: ['collection'] },
  { path: '/comm/open-asks', archetypes: ['collection'] },
  { path: '/comm/find-partner', archetypes: ['collection'] },
  { path: '/comm/talk-to-vitana', archetypes: ['collection'] },
  { path: '/community/event-game', archetypes: ['collection'] },
  { path: '/creator/onboarded', archetypes: ['collection'] },
  { path: '/my-tickets', archetypes: ['collection'] },
  { path: '/sharing/distribution', archetypes: ['collection'] },
  { path: '/patient/results', archetypes: ['collection'] },
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
  for (const width of [1280, 1440]) {
    test(`VTID-05117: ${route.path} is a ${route.archetypes.join('/')} Spotlight screen at ${width}px`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await page.goto(`${route.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });

      const frame = page.locator('[data-archetype]').first();
      await expect(frame).toBeVisible({ timeout: 25_000 });
      const archetype = await frame.getAttribute('data-archetype');
      expect(route.archetypes, `archetype on ${route.path}`).toContain(archetype);

      const sidebar = page.locator('[data-sidebar="sidebar"]').first();
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
      expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
      await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();

      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('[data-archetype-skeleton], [data-member-skeleton]')).toHaveCount(0, { timeout: 20_000 });
      const pageSpinners = await page.evaluate(
        () => [...document.querySelectorAll('[data-archetype] .animate-spin')].filter((el) => !el.closest('button')).length,
      );
      expect(pageSpinners, 'page-level spinner after load').toBe(0);

      if (archetype && SINGLE.has(archetype)) {
        await expect(page.locator('[data-vcard-size="spotlight"]').first()).toBeVisible({ timeout: 20_000 });
        const inFirstViewport = await page.evaluate(() =>
          [...document.querySelectorAll('[data-vcard-size="spotlight"]')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.top < innerHeight && r.bottom > 0;
          }).length,
        );
        expect(inFirstViewport, 'exactly one spotlight card in the first viewport').toBe(1);
      }

      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      await page.waitForTimeout(300);
      expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
    });
  }
}
