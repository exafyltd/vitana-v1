// VTID-05036 — Admin › Marketplace › Rewards Shop (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - this build carries the screen (its German strings are in the entry
//     bundle, the German catalog being the eagerly bundled one);
//   - the staging gateway answers the three admin GETs the screen reads
//     (items, shipping fees, orders) with 200 for an exafy admin or 403 for
//     anyone else — never a 404/HTML page;
//   - the screen is NOT opened in a browser on staging (see the note at the
//     end of the test): the read-only guard blocks the app's role read, so the
//     route bounces to Home. Rendering is proven by Vitest in the same run.
// Nothing is saved, uploaded or deleted: no save button is ever clicked.
// Writes are proven by Vitest (RewardsShop.test.tsx) and the gateway's Jest.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05024 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('Admin › Rewards Shop is in this build and its admin reads answer JSON on staging', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  // Two viewports × three sections, each waiting on the staging gateway.
  test.setTimeout(180_000);

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  expect(bundle, 'the VTID-05036 admin texts are not in this build').toContain('Nur für Exafy-Admins');
  expect(bundle).toContain('Prämien-Shop verwalten');

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

  // The three reads the screen makes: exafy admin → 200 { ok: true }, anyone else → 403 JSON.
  for (const path of ['/api/v1/admin/rewards/items', '/api/v1/admin/rewards/shipping-fees', '/api/v1/admin/rewards/orders']) {
    const res = await request.get(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    expect([200, 403], `${path} → ${res.status()}`).toContain(res.status());
    expect(res.headers()['content-type'] ?? '', `${path} must answer JSON`).toContain('application/json');
    const body = await res.json();
    if (res.status() === 200) expect(body.ok, path).toBe(true);
    else expect(body.error, path).toBe('FORBIDDEN');
  }

  // No browser visit to /admin here. Under the read-only staging guard the
  // app's role/tenant reads (get_role_preference, list_my_memberships) are
  // POSTs and are aborted, so useRoleRouteEnforcement treats the session as
  // "community" and bounces /admin/* to /home, whose own POSTs (daily matches,
  // ORB telemetry) the guard then blocks. STAGING-VERIFY runs 38048793038 and
  // 38051971944 both ended on Home with Vitana's greeting open; answering the
  // role read locally (#1323) was not enough. The screen's rendering, form,
  // photo upload, fees, orders and 403 state are proven by
  // src/pages/admin/marketplace/RewardsShop.test.tsx (run in the same
  // STAGING-VERIFY) and by docs/validation/VTID-05036/screenshots/.
});
