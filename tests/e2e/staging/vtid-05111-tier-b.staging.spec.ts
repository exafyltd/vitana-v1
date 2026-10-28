// VTID-05111 — Spotlight Phase 5 (Tier B adoption): Health, Wallet, AI, Settings,
// Calendar, Intents and Sharing screens on ScreenFrame behind the
// `desktop_spotlight` flag. Read-only: './staging-guard' aborts every write;
// nothing but navigation happens here (no clicks on controls).
//
// For every static Tier B route migrated in this phase, signed in as the test user:
//   ?spotlight=1 at 1280 and 1440 px
//     - the screen is framed by ScreenFrame with the archetype the route has in
//       src/design/screen-manifest.json;
//     - the Vitanaland sidebar chrome is intact (search, nav items, footer);
//     - no full-screen DelayedLoader and no page-level spinner once the screen settled;
//     - dashboards show exactly one spotlight card in the first viewport;
//     - no horizontal scroll, LTR and with dir="rtl".
//   ?spotlight=0 — no [data-archetype] (today's screen).
// The localStorage override is cleared at the end so the browser profile is left as found.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

const ROUTES = [
  '/health',
  '/health/pillars',
  '/health/services-hub',
  '/health/conditions',
  '/health/education',
  '/health/my-biology',
  '/health/plans',
  '/health/vitana-index',
  '/wallet',
  '/wallet/balance',
  '/wallet/subscriptions',
  '/wallet/rewards',
  '/ai',
  '/ai/insights',
  '/ai/recommendations',
  '/ai/daily-summary',
  '/ai/companion',
  '/assistant',
  '/settings/notifications',
  '/settings/limitations',
  '/settings/billing',
  '/settings/tenant-role',
  '/connectors',
  '/support',
  '/calendar',
  '/reminders',
  '/intents/board',
  '/intents/mine',
  '/sharing',
  '/sharing/campaigns',
  '/sharing/data-consent',
];

function loadManifest(): Map<string, string> {
  const candidates = [
    path.resolve(process.cwd(), 'src/design/screen-manifest.json'),
    fileURLToPath(new URL('../../../src/design/screen-manifest.json', import.meta.url)),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('src/design/screen-manifest.json not found');
  const screens = JSON.parse(fs.readFileSync(file, 'utf8')).screens as { path: string; archetype: string }[];
  return new Map(screens.map((s) => [s.path, s.archetype]));
}
const ARCHETYPE = loadManifest();

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

/** Spinners in the stage that are not inside a button (a button may show its own busy state). */
async function stageSpinners(page: import('@playwright/test').Page) {
  return page.evaluate(
    () => [...document.querySelectorAll('[data-spotlight-stage] .animate-spin')].filter((el) => !el.closest('button')).length,
  );
}

test('VTID-05111: every Tier B route of this phase is in the manifest', () => {
  for (const route of ROUTES) expect(ARCHETYPE.get(route), route).toBeTruthy();
});

for (const route of ROUTES) {
  test(`VTID-05111: ${route} — Spotlight frame, chrome intact, no spinner, no horizontal scroll (1280/1440, LTR/RTL)`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const archetype = ARCHETYPE.get(route)!;

    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${route}?spotlight=1`, { waitUntil: 'domcontentloaded' });

      const frame = page.locator('[data-archetype]').first();
      await expect(frame).toBeVisible({ timeout: 30_000 });
      await expect(frame).toHaveAttribute('data-archetype', archetype);

      const sidebar = page.locator('[data-sidebar="sidebar"]').first();
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
      expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
      await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();

      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 20_000 });
      await expect.poll(() => stageSpinners(page), { timeout: 20_000, message: 'page-level spinner after load' }).toBe(0);

      if (archetype === 'dashboard') {
        await expect(page.locator('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])').first()).toBeVisible({ timeout: 20_000 });
        const inFirstViewport = await page.evaluate(
          () =>
            [...document.querySelectorAll('[data-vcard-size="spotlight"]')].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.top < innerHeight && r.bottom > 0;
            }).length,
        );
        expect(inFirstViewport, 'exactly one spotlight card in the first viewport').toBe(1);
      }

      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(await overflow(), `horizontal scroll (LTR, ${width}px)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      await page.waitForTimeout(300);
      expect(await overflow(), `horizontal scroll (RTL, ${width}px)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'ltr';
      });
    }

    // Flag off: today's screen, no Spotlight frame. (/intents/mine renders without the app shell today,
    // so this waits for the app root rather than the sidebar.)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${route}?spotlight=0`, { waitUntil: 'domcontentloaded' });
    // The first children of #root are a <script> and the two 0-height toast regions; wait for a rendered child.
    await expect(page.locator('#root > *:visible').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-archetype]')).toHaveCount(0);

    await page.goto(`${route}?spotlight=clear`, { waitUntil: 'domcontentloaded' });
  });
}
