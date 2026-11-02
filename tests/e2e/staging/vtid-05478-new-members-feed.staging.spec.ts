// VTID-05478 — the New members card is listed by the gateway, not read from the table (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in token call is the only one
// allowed. The spec opens the feed as the test account and checks WHERE the listing comes from: a GET to
// the gateway's /community/new-members with the member's bearer token, and no browser read of the
// opt-in columns of global_community_profiles. What the route returns (test/service/bot accounts and the
// caller excluded, 503 on a failed lookup) is proven by the gateway jest suite and the hook vitest suites;
// the exclusion tables are service-side, so the browser cannot compare ids and nothing is written here.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05133 spec) plus every ORB call.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/|gateway\.vitanaland\.com\/api\/v1\/diag\/notif-tap)/,
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
  }, session);
}


test('VTID-05478: the feed asks the gateway for new members and never reads them from the table', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  const tableReads: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && /rest\/v1\/global_community_profiles/.test(r.url()) && /community_intro_opt_in/.test(decodeURIComponent(r.url()))) {
      tableReads.push(r.url().slice(0, 160));
    }
  });

  const gatewayCall = page.waitForResponse((r) => /\/api\/v1\/community\/new-members\?limit=5/.test(r.url()), { timeout: 45_000 });
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  const res = await gatewayCall;

  const req = res.request();
  expect(req.method()).toBe('GET');
  expect(req.headers()['authorization'] ?? '').toMatch(/^Bearer .+/);
  expect(res.url()).toMatch(/^https:\/\/(preview-aws-gateway|gateway)\.vitanaland\.com\//);
  // 200 with the contract shape, or a failure that shows no card (never an error page).
  if (res.status() === 200) {
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeLessThanOrEqual(5);
    for (const m of body.members) expect(Object.keys(m).sort()).toEqual(['avatar_url', 'bio', 'created_at', 'display_name', 'user_id']);
  } else {
    expect([401, 403, 503]).toContain(res.status());
  }
  expect(tableReads, 'the new-member listing must not be read from global_community_profiles').toEqual([]);
  await page.screenshot({ path: 'test-results/vtid-05478-new-members-feed-phone.png', fullPage: false });
});
