// VTID-04919 — Share on a Live Room card opens the NATIVE share drawer (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The page gets a
// stub navigator.share (before the app loads) that only records the call, so
// nothing is shared anywhere. The room is a real scheduled room read with a GET;
// the spec is skipped when none exists. Nothing is subscribed or posted.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04864 spec)
    // plus the Live Rooms list's read RPC for "Notify me" counts, and every
    // ORB call: /comm/events-meetups is a MAXINA front-door route, so the
    // Vitana ORB opens on its own (useOrbFrontDoor) and starts a voice
    // session — those POSTs are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_live_stream_subscriber_counts|get_live_stream_subscribers)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
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
  signedIn = { key: key!, token: session.access_token as string };
  return bundle;
}

let signedIn: { key: string; token: string } = { key: '', token: '' };


test('VTID-04919: Share on a Live Room card calls navigator.share, not the custom sheet (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  const since = new Date().toISOString();
  const res = await request.get(
    `${SUPABASE}/rest/v1/community_live_streams?select=id,title&status=eq.pending&scheduled_for=gte.${encodeURIComponent(since)}&order=scheduled_for.asc&limit=1`,
    { headers: { apikey: signedIn.key, Authorization: `Bearer ${signedIn.token}` } },
  );
  expect(res.status()).toBe(200);
  const rooms = (await res.json()) as Array<{ id: string; title: string }>;
  test.skip(rooms.length === 0, 'no scheduled room to show');
  const roomId = rooms[0].id;

  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (d: unknown) => {
        (window as unknown as { __shared: unknown[] }).__shared.push(d);
        return Promise.resolve();
      },
    });
  });
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto('/comm/events-meetups?tab=upcoming', { waitUntil: 'domcontentloaded' });
  const card = page.locator(`[data-event-id="${roomId}"][data-live-room]`).first();
  await expect(card).toBeAttached({ timeout: 20_000 });
  await card.getByTestId('live-room-card-share').locator('button').first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length), { timeout: 10_000 }).toBe(1);
  const shared = (await page.evaluate(() => (window as unknown as { __shared: Array<{ title: string; url: string }> }).__shared[0]));
  expect(shared.url).toContain(roomId);
  // The custom share sheet must not have opened.
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
