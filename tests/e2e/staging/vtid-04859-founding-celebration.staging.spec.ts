// VTID-04859 — Founding 1000: a registered test account never gets a seat,
// and the celebration never shows for it.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (registered in notification_test_actors,
// so excluded from Founding seats by CLAUDE.md rules 43-45), reads
// /api/v1/billing/founding/me through the app's own gateway and checks that
// Home renders without the celebration. It taps nothing.
import { test, expect } from './staging-guard';

test.use({
  // VTID-04855: one RegExp, not an array — Playwright reads an array option as
  // its [value, options] tuple and would keep only the first pattern. The last
  // alternatives are read-only lookups the signed-in app sends as POST (Supabase
  // RPCs, list_my_memberships, the ORB prewarm): still aborted, never writes.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('the test account has no Founding seat and sees no celebration', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
  const bundle = await (await request.get(anon)).text();
  // The anon key is the JWT in the bundle whose payload names this project and role anon.
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

  const foundingResponse = page.waitForResponse((r) => r.url().includes('/api/v1/billing/founding/me'), { timeout: 45_000 });
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  const founding = await foundingResponse;
  expect(founding.status()).toBe(200);
  const body = await founding.json();
  expect(body.ok).toBe(true);
  expect(body.founding, 'a registered test account must never hold a Founding seat').toBe(false);
  expect(body.max_seats).toBe(1000);

  await expect(page.getByTestId('founding-celebration')).toHaveCount(0);
});
