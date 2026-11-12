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

// Console / page errors of the screen under test, minus the harness's own noise.
// The read-only staging guard aborts every guarded POST (analytics beacons, and
// the read-only Supabase RPCs supabase-js sends as POST, e.g.
// rpc/get_role_preference). The browser logs each abort as
// net::ERR_BLOCKED_BY_CLIENT, and supabase-js / the app surface the same abort
// as "TypeError: Failed to fetch" (incl. "Error getting role preference:
// TypeError: Failed to fetch"). Those are dropped only up to the number of
// Supabase REST/RPC fetch/xhr requests the guard actually aborted on this page;
// every other error still fails the test.
//
// Why the match is exact: a substring /Failed to fetch/ would also swallow
// "TypeError: Failed to fetch dynamically imported module: …" (a lazy-route
// chunk-load failure, a real regression). So the Supabase rule tests only the
// first line of a message, and stack lines after the summary cannot break it.
// Only aborted fetch/xhr calls to the Supabase REST host count towards the
// budget: beacons, images and other aborted resources never log "Failed to fetch".
const SUPABASE_FETCH_REJECTION = /(^|: )(TypeError: )?Failed to fetch$/;
// The same abort as a logged PostgREST error object: supabase-js resolves a
// rejected fetch to { message: 'TypeError: Failed to fetch', details: <stack>,
// hint: '', code: '' }, which the browser prints as
// "<app prefix>: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch\n  at …, hint: , code: }"
// (useRole's "Error getting role preference: …" for the guarded
// rpc/get_role_preference). Only that exact shape counts, against the same budget.
const POSTGREST_FETCH_REJECTION =
  /^[^\n{]*: \{message: TypeError: Failed to fetch, details: TypeError: Failed to fetch(\n[\s\S]*)?, hint: , code: \}$/;
const isSupabaseFetchRejection = (t: string) =>
  !/dynamically imported module/i.test(t) &&
  (SUPABASE_FETCH_REJECTION.test(t.trim().split('\n')[0]) || POSTGREST_FETCH_REJECTION.test(t.trim()));

type ErrorCollector = { real: () => string[]; failedRequests: () => string };
function collectRealErrors(page: import('@playwright/test').Page): ErrorCollector {
  const raw: string[] = [];
  const failed: string[] = [];
  let guardAborts = 0;
  // The browser's own log line for a guard-aborted request ("Failed to load
  // resource: net::ERR_BLOCKED_BY_CLIENT"); any other load failure still counts.
  const isBlockedNoise = (t: string) => /net::ERR_BLOCKED_BY_CLIENT/.test(t);
  page.on('requestfailed', (r) => {
    const errorText = r.failure()?.errorText ?? '';
    // Every failed request is listed in the failure message (diagnosis only;
    // it never drops an error).
    failed.push(`${r.method()} ${r.url().split('?')[0]} ${r.resourceType()} ${errorText}`);
    if (
      /ERR_BLOCKED_BY_CLIENT/.test(errorText) &&
      (r.resourceType() === 'fetch' || r.resourceType() === 'xhr') &&
      r.url().startsWith(`${SUPABASE}/rest/v1/`)
    ) guardAborts++;
  });
  page.on('console', (m) => { if (m.type() === 'error' && !isBlockedNoise(m.text())) raw.push(m.text()); });
  page.on('pageerror', (e) => { if (!isBlockedNoise(String(e))) raw.push(String(e)); });
  return {
    real: () => {
      let budget = guardAborts;
      return raw.filter((t) => {
        if (budget > 0 && isSupabaseFetchRejection(t)) { budget--; return false; }
        return true;
      });
    },
    failedRequests: () => failed.join(' ; '),
  };
}

// Sign in on /maxina, then leave that document through about:blank before the
// collector starts: requests the sign-in page still had in flight are cancelled
// by the navigation and logged by that page, not by the screen under test.
// Everything the screen under test logs still counts.
async function signInThenBlank(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  await signIn(page, request);
  await page.goto('about:blank');
}

for (const [path, archetype] of ROUTES) {
  test(`colours-batch-4: ${path} renders without console errors at 1440 (?spotlight=1)`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInThenBlank(page, request);
    const errors = collectRealErrors(page);
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

    { const real = errors.real(); expect(real, `console errors on ${path}: ${real.join(' | ')} || failed requests: ${errors.failedRequests()}`).toHaveLength(0); }
  });

  test(`colours-batch-4: ${path} renders without console errors at 390`, async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThenBlank(page, request);
    const errors = collectRealErrors(page);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    // Mobile: the content mounts (no app shell sidebar assert); the colour swap
    // must not add horizontal scroll or throw.
    // AppLayout always renders a <main>; #root's own first children can be
    // hidden injected nodes (toast region), so wait for <main>.
    await expect(page.locator('main').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, 'horizontal scroll (mobile)').toBeLessThanOrEqual(1);

    { const real = errors.real(); expect(real, `console errors on ${path} (mobile): ${real.join(' | ')} || failed requests: ${errors.failedRequests()}`).toHaveLength(0); }
  });
}
