// VTID-05155 — one /api/v1, never two (staging, read-only).
//
// The member page /settings/limitations (and three admin marketplace pages)
// built their gateway base from VITE_GATEWAY_URL — which already ends in
// /api/v1 — and then added /api/v1 again, so every request 404'd. They now use
// the bare origin (GATEWAY_BASE). './staging-guard' (copied in by the runner)
// aborts every write; the sign-in token call is the only one allowed. Checks:
//   - /settings/limitations, on desktop and phone, sends
//     GET <gateway>/api/v1/user/limitations and /impact, and both answer 200 JSON;
//   - no request in the session contains /api/v1/api/v1;
//   - GET <gateway>/api/v1/admin/partner-health/orders with the test user's
//     token answers JSON, not an HTML 404 — the single-prefix route the admin
//     page now calls exists: 200 ok:true for an exafy_admin token (the staging
//     test account is one), JSON 401/403 ok:false for anyone else.
// GETs and navigation only — nothing is clicked, nothing is saved.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05056 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const LIMITATIONS = `${GATEWAY}/api/v1/user/limitations`;
const IMPACT = `${LIMITATIONS}/impact`;

test('limitations page calls the gateway with a single /api/v1, read-only', async ({ page, request }, testInfo) => {
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

  // 1. The single-prefix admin route exists and answers JSON, never an HTML 404 (GET only).
  //    The exact answer follows the signed-in account's own claim: an exafy_admin
  //    (the staging test account is one) gets 200 ok:true; anyone else must get a
  //    JSON 401/403 ok:false. Each case is asserted exactly.
  const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf8'));
  const isExafyAdmin = claims?.app_metadata?.exafy_admin === true || claims?.app_metadata?.exafy_admin === 'true';
  const admin = await request.get(`${GATEWAY}/api/v1/admin/partner-health/orders`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(admin.headers()['content-type'] ?? '').toContain('application/json');
  const adminBody = await admin.json();
  if (isExafyAdmin) {
    expect(admin.status(), 'exafy_admin: admin partner-health status').toBe(200);
    expect(adminBody.ok).toBe(true);
  } else {
    expect([401, 403], `non-admin: admin partner-health status ${admin.status()}`).toContain(admin.status());
    expect(adminBody.ok).toBe(false);
  }

  // 2. Every request the app makes, and any write to the limitations route.
  const doubled: string[] = [];
  const writes: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/api/v1')) doubled.push(`${req.method()} ${req.url()}`);
    if (req.url().startsWith(LIMITATIONS) && req.method() !== 'GET') writes.push(`${req.method()} ${req.url()}`);
  });

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  for (const [name, viewport] of [
    ['desktop', { width: 1400, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ] as const) {
    await page.setViewportSize(viewport);
    const isGet = (url: string) => (r: { url(): string; request(): { method(): string } }) =>
      r.url().split('?')[0] === url && r.request().method() === 'GET';
    const limCall = page.waitForResponse(isGet(LIMITATIONS), { timeout: 30_000 });
    const impactCall = page.waitForResponse(isGet(IMPACT), { timeout: 30_000 });
    await page.goto('/settings/limitations', { waitUntil: 'domcontentloaded' });

    for (const [label, call] of [['limitations', limCall], ['impact', impactCall]] as const) {
      const res = await call;
      expect(res.status(), `${name}: ${label} status`).toBe(200);
      expect(res.headers()['content-type'] ?? '', `${name}: ${label} content-type`).toContain('application/json');
      await res.json();
    }

    await page.waitForTimeout(1_000);
    await testInfo.attach(`limitations-${name}`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  }

  expect(doubled, 'a request carried a doubled /api/v1 prefix').toEqual([]);
  expect(writes, 'a write to the limitations route was sent').toEqual([]);
});
