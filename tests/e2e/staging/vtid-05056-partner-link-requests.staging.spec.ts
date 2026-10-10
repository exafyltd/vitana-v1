// VTID-05056 — Health Hub D8 on staging (read-only): the member's partner-link
// requests on /patient/results.
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - GET /api/v1/partner-health/member/link-requests answers 200 JSON
//     { ok: true, requests: [] | [...] } for the signed-in test user (empty
//     while the VTID-05055 migration is not applied on the shared database);
//   - /patient/results renders on desktop and phone, the page itself fetches
//     the link requests, and the card is shown only when there is a request;
//   - nothing is confirmed or declined — no POST to link-requests is ever sent.
// GETs and navigation only — nothing is clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05032 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const LINK_REQUESTS = '/api/v1/partner-health/member/link-requests';

const TITLE = /^(Deine Ergebnisse|Your results)$/;

test('patient results lists partner link requests from the gateway, read-only', async ({ page, request }, testInfo) => {
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

  // 1. The gateway's own answer (GET only).
  const res = await request.get(`${GATEWAY}${LINK_REQUESTS}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type'] ?? '').toContain('application/json');
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.requests), 'requests is not an array').toBe(true);
  for (const r of body.requests as Record<string, unknown>[]) {
    // The member sees only these four fields — never raw payloads or staff ids.
    expect(Object.keys(r).sort()).toEqual(['id', 'partner_display_name', 'proposed_at', 'test_name']);
  }
  const pending = (body.requests as unknown[]).length;

  // Any write to link-requests (confirm / decline) would be a failure.
  const decisions: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes(LINK_REQUESTS) && req.method() !== 'GET') decisions.push(`${req.method()} ${req.url()}`);
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
    const pageCall = page.waitForResponse((r) => r.url().includes(LINK_REQUESTS) && r.request().method() === 'GET', { timeout: 30_000 });
    await page.goto('/patient/results', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible({ timeout: 30_000 });

    // The page itself asks the gateway, and gets JSON with a list back.
    const pageRes = await pageCall;
    expect(pageRes.status(), `${name}: page link-requests status`).toBe(200);
    const pageBody = await pageRes.json();
    expect(pageBody.ok).toBe(true);
    expect(Array.isArray(pageBody.requests)).toBe(true);

    await page.waitForTimeout(1_000);
    const card = page.getByTestId('partner-link-requests');
    if (pending === 0) {
      await expect(card, `${name}: card shown with no pending request`).toHaveCount(0);
    } else {
      await expect(card).toBeVisible();
      await expect(page.getByTestId('partner-link-request')).toHaveCount(pending);
    }
    await testInfo.attach(`patient-results-${name}`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  }

  expect(decisions, 'a confirm/decline request was sent').toEqual([]);
});
