// VTID-04965 — the Live Room drawer: the host's name is a link to their profile,
// share is the shared share control, and a room in the address (?event=<id>)
// opens its drawer — the path the browser's Back button takes after the profile.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens the Events page, takes the first
// live-room card's id and opens that room through the address. It taps nothing
// that writes (no "Erinnern", no share) — the calendar entry itself is proven by
// the platform's throwaway-Postgres test, not here.
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
test('a room opens from the address with a host link and the shared share control', async ({ page, request }) => {
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

  // VTID-04871: the role gate (ProtectedRoute) shows a spinner while the role
  // preference loads, and that lookup is a POST RPC the staging guard aborts.
  // React Query then retries it and the calendar flips back to the spinner on
  // every retry, so the + button was "not found" moments after the page drew.
  // Answer that one read-only lookup here with the test user's real role
  // (community): nothing reaches Supabase, and the guard still aborts every
  // other write.
  await page.route(/\/rest\/v1\/rpc\/get_role_preference(\?|$)/, (route) => route.fulfill({ json: [{ role: 'community' }] }));


  await page.goto('/comm/events-meetups', { waitUntil: 'domcontentloaded' });
  const roomShare = page.getByTestId('live-room-card-share').first();
  const hasRoom = await roomShare.waitFor({ state: 'attached', timeout: 45_000 }).then(() => true, () => false);
  test.skip(!hasRoom, 'no live-room card on staging right now');
  const id = await roomShare.evaluate((el) => el.closest('[data-event-id]')?.getAttribute('data-event-id') ?? '');
  expect(id, 'the room card carries its id').toBeTruthy();

  await page.goto(`/comm/events-meetups?event=${id}`, { waitUntil: 'domcontentloaded' });
  const host = page.getByTestId('live-room-host-link');
  await expect(host).toBeVisible({ timeout: 45_000 });
  expect(await host.evaluate((el) => el.tagName)).toBe('BUTTON');
  expect(await host.getAttribute('aria-label')).toBeTruthy();
  await expect(page.getByTestId('live-room-drawer-share')).toBeVisible();
  expect(await page.getByTestId('live-room-drawer-share').locator('button').count()).toBe(1);
});
