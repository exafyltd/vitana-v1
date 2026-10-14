// VTID-05117 — Spotlight Phase 7.5 (part C): the remaining legacy routes on the
// Spotlight contract. Read-only: './staging-guard' aborts every write and
// nothing is clicked — the spec only navigates and reads the DOM.
//
// Signed in, with Spotlight forced on (?spotlight=1) at 1280 and 1440 px:
//   - the screen is framed by ScreenFrame with the manifest's archetype (SR-03);
//   - the Vitanaland sidebar chrome is intact (SR-01);
//   - after the screen settled there is no page spinner and no skeleton (SR-20);
//   - focus-feed / storefront / detail show exactly ONE spotlight card in the
//     first viewport (SR-06) — also when there is nothing to show: the deals
//     storefront without a real discount, a post that does not exist and a game
//     slug that does not exist each show one honest text-only spotlight card;
//   - no horizontal scroll, LTR and with dir="rtl" (SR-19).
// Signed out, /dev/login (outside the app shell) is framed as `workspace` (operator tier C).
// /home/compose and /home/comments open the composer / comments sheet of the
// same News screen; the staging design-lint visits them, Vitest pins them.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const SINGLE = new Set(['focus-feed', 'storefront', 'detail', 'dashboard']);
const MISSING = '00000000-0000-4000-8000-000000005117';

// `shell: false` — a public guest landing (AuthGuard allowGuest) that has never had the
// app shell; it must stay that way, so the sidebar is asserted absent there.
const ROUTES: { path: string; archetype: string; shell?: false }[] = [
  { path: '/home/notif', archetype: 'focus-feed' },
  { path: '/me/matches', archetype: 'collection' },
  { path: '/profile/me/privacy', archetype: 'form' },
  { path: '/discover/deals-offers', archetype: 'storefront' },
  { path: `/post/post/${MISSING}`, archetype: 'detail' },
  { path: '/e/game/vtid-05117-no-such-game', archetype: 'detail', shell: false },
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

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  await page.waitForTimeout(300);
  expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
}

for (const route of ROUTES) {
  for (const width of [1280, 1440]) {
    test(`VTID-05117: ${route.path} is a ${route.archetype} Spotlight screen at ${width}px`, async ({ page, request }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await page.goto(`${route.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });

      const frame = page.locator('[data-archetype]').first();
      await expect(frame).toBeVisible({ timeout: 25_000 });
      await expect(frame).toHaveAttribute('data-archetype', route.archetype);

      const sidebar = page.locator('[data-sidebar="sidebar"]').first();
      if (route.shell === false) {
        await expect(page.locator('[data-sidebar="sidebar"]')).toHaveCount(0);
      } else {
        await expect(sidebar).toBeVisible();
        await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
        expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
        await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();
      }

      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('[data-archetype-skeleton], [data-member-skeleton]')).toHaveCount(0, { timeout: 20_000 });
      const pageSpinners = await page.evaluate(
        () => [...document.querySelectorAll('[data-archetype] .animate-spin')].filter((el) => !el.closest('button')).length,
      );
      expect(pageSpinners, 'page-level spinner after load').toBe(0);

      if (SINGLE.has(route.archetype)) {
        await expect(page.locator('[data-vcard-size="spotlight"]').first()).toBeVisible({ timeout: 20_000 });
        const inFirstViewport = await page.evaluate(() =>
          [...document.querySelectorAll('[data-vcard-size="spotlight"]')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.top < innerHeight && r.bottom > 0;
          }).length,
        );
        expect(inFirstViewport, 'exactly one spotlight card in the first viewport').toBe(1);
      }
      if (route.path.startsWith('/post/')) await expect(page.locator('[data-post-not-found]')).toBeVisible();
      if (route.path.startsWith('/e/game/')) await expect(page.locator('[data-event-game-unavailable]')).toBeVisible();

      await expectNoHorizontalScroll(page);
    });
  }
}

test('VTID-05117: /dev/login (signed out) is a workspace screen around the sign-in form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/dev/login?spotlight=1', { waitUntil: 'domcontentloaded' });
  const frame = page.locator('[data-archetype="workspace"]').first();
  await expect(frame).toBeVisible({ timeout: 25_000 });
  await expect(frame.locator('form input[type="email"]')).toBeVisible();
  await expectNoHorizontalScroll(page);
});
