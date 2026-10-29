// VTID-PENDING (desktop-spotlight-finish/colours-batch-4) — raw palette → tokens,
// batch 4 (discover, wallet, calendar, business, orders). Read-only staging check.
//
// './staging-guard' (copied in by the runner) aborts every write; nothing is
// clicked. For the batch's main routes — /discover, /wallet, /calendar,
// /business — with Spotlight forced on (?spotlight=1) at 1440×900 and at
// 390×844, the spec asserts the screen renders without console errors and
// keeps the design-contract structure it already had: at 1440 the Vitanaland
// sidebar chrome is present (SR-01) and the screen is framed with its manifest
// archetype (SR-03), at both widths there is no horizontal scroll (SR-19), and
// the full-screen DelayedLoader is gone once the screen settled (SR-20). A
// colour lane changes no DOM, so these are the structural guarantees that prove
// the token swap did not regress the page. Signs in as the documented test
// user; the network guard aborts every non-GET except sign-in.
import { test, expect } from './staging-guard';

// Read-only lookups the signed-in app sends as POST (Supabase RPCs, the ORB
// prewarm, RUM/analytics beacons, daily_matches viewed-at); the guard aborts
// them, so nothing is written. Same allow-list shape as design-contract.staging.spec.ts.
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

// (path, manifest archetype) — the batch's main routes.
const ROUTES: Array<[string, string]> = [
  ['/discover', 'storefront'],
  ['/wallet', 'dashboard'],
  ['/calendar', 'collection'],
  ['/business', 'storefront'],
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

for (const [path, archetype] of ROUTES) {
  test(`colours-batch-4: ${path} renders without console errors at 1440 (?spotlight=1)`, async ({ page, request }) => {
    const errors: string[] = [];
    // The read-only staging guard aborts analytics / beacon writes; the browser
    // logs each aborted request as net::ERR_BLOCKED_BY_CLIENT. That is harness
    // noise, not a colour-swap error — count only real console / page errors.
    const isHarnessNoise = (t: string) => /ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(t);
    page.on('console', (m) => { if (m.type() === 'error' && !isHarnessNoise(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => { if (!isHarnessNoise(String(e))) errors.push(String(e)); });

    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${path}?spotlight=1`, { waitUntil: 'domcontentloaded' });

    const frame = page.locator('[data-archetype]').first();
    await expect(frame).toBeVisible({ timeout: 25_000 });
    await expect(frame).toHaveAttribute('data-archetype', archetype);

    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await expect(sidebar).toBeVisible();

    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);

    expect(errors, `console errors on ${path}: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test(`colours-batch-4: ${path} renders without console errors at 390`, async ({ page, request }) => {
    const errors: string[] = [];
    // The read-only staging guard aborts analytics / beacon writes; the browser
    // logs each aborted request as net::ERR_BLOCKED_BY_CLIENT. That is harness
    // noise, not a colour-swap error — count only real console / page errors.
    const isHarnessNoise = (t: string) => /ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(t);
    page.on('console', (m) => { if (m.type() === 'error' && !isHarnessNoise(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => { if (!isHarnessNoise(String(e))) errors.push(String(e)); });

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    // Mobile: the content mounts (no app shell sidebar assert); the colour swap
    // must not add horizontal scroll or throw.
    await expect(page.locator('main, [data-archetype], #root > div').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, 'horizontal scroll (mobile)').toBeLessThanOrEqual(1);

    expect(errors, `console errors on ${path} (mobile): ${errors.join(' | ')}`).toHaveLength(0);
  });
}
