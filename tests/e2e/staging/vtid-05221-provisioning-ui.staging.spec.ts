// VTID-05221 — exafy-admin "New community" panel on Admin › System › Tenants.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every non-GET
// to a gateway or to Supabase except the sign-in token call, and fails the
// test on any abort it was not told to expect. Signs in as the documented test
// user (same flow as the VTID-05113/05155 specs), who is NOT an exafy_admin.
// Checks:
//   1. GET <gateway>/api/v1/admin/tenants with that user's token answers
//      403 JSON { ok: false, error: 'FORBIDDEN' } — the gateway gate, not only
//      the UI;
//   2. /admin/system/tenants settles (Not Authorized for a non-admin, the
//      tenant screen for a non-exafy admin) and the New community panel
//      ([data-testid="new-community-panel"]) is not rendered;
//   3. no non-GET request to the tenant provisioning API is ever attempted.
// Navigation and GETs only: nothing is clicked, typed, saved or uploaded. The
// exafy_admin path (create, brand pack, assets, readiness) is proven by Vitest.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  // The signed-in app's own POSTs on an admin route (same list as the VTID-05113
  // spec) — still aborted, never reach the database. Nothing under
  // /api/v1/admin/tenants is tolerated here.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const TENANTS_API = '/api/v1/admin/tenants';

test('VTID-05221: a non-exafy user gets 403 FORBIDDEN from the tenants API and no New community panel', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  test.setTimeout(180_000);

  // Every non-GET the page attempts against the tenant provisioning API (the
  // guard aborts it; this list proves none was even tried).
  const tenantWrites: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes(TENANTS_API) && req.method().toUpperCase() !== 'GET') tenantWrites.push(`${req.method()} ${req.url()}`);
  });

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

  // The plan's premise: the staging test user is not an exafy_admin (the gateway
  // checks app_metadata.exafy_admin === true). Fail loudly if that changes.
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf8'));
  expect(claims?.app_metadata?.exafy_admin, 'the staging test user must not be an exafy_admin').not.toBe(true);

  // 1. The gateway gate (GET only).
  const res = await request.get(`${GATEWAY}${TENANTS_API}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(res.status(), `${TENANTS_API} → ${res.status()}`).toBe(403);
  expect(res.headers()['content-type'] ?? '', `${TENANTS_API} must answer JSON`).toContain('application/json');
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(body.error).toBe('FORBIDDEN');

  // 2. The screen settles and the panel is absent.
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto('/admin/system/tenants', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible({ timeout: 45_000 });
  // Not Authorized (non-admin: its link home) or the tenant screen's header (non-exafy admin).
  const denied = page.locator('main a[href="/"]');
  const header = page.locator('main h1');
  await expect(denied.or(header).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-testid="new-community-panel"]')).toHaveCount(0);

  // 3. No write to the tenant provisioning API was attempted.
  expect(tenantWrites, 'a non-GET to the tenant provisioning API was attempted').toEqual([]);
});
