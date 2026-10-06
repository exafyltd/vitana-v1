// VTID-04906 / VTID-04907 — Live Rooms on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). Checks:
//   - the build carries the rebuilt room (its German catalog strings);
//   - /comm/live-rooms renders, no horizontal overflow;
//   - a room page (an id that has no room) renders the app-level header with
//     the exit button — nothing is clicked there, never Join / Go Live / Start;
//   - /comm/events-meetups renders, its "+" dialog offers "Live Room" (the
//     dialog is opened and closed with Escape — no option is chosen, nothing
//     is submitted), no horizontal overflow;
//   - a live or scheduled room shows as a normal, full event card with a red
//     LIVE badge on the Hot and Upcoming tabs (no separate strip).
// Entering a real room records attendance (a write) and is never done here.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04864 spec)
    // plus the Live Rooms list's read RPC for "Notify me" counts, and every
    // ORB call: /comm/events-meetups is a MAXINA front-door route, so the
    // Vitana ORB opens on its own (useOrbFrontDoor) and starts a voice
    // session — those POSTs are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_live_stream_subscriber_counts)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
// A well-formed id that belongs to no room: the page renders its entry
// screen without entering anything.
const NO_ROOM = '00000000-0000-4000-8000-000000000000';

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

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('VTID-04906: Live Rooms list and the room page with its exit button (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bundle = await signIn(page, request);
  // German is the eagerly bundled catalog: the rebuilt room's strings.
  expect(bundle, 'the rebuilt Live Room is not in this build').toContain('Für alle beenden');

  await page.goto('/comm/live-rooms', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Live Rooms' }).first()).toBeVisible({ timeout: 20_000 });
  await expectNoHorizontalOverflow(page);

  await page.goto(`/comm/live-rooms/${NO_ROOM}/view`, { waitUntil: 'domcontentloaded' });
  const exit = page.getByTestId('live-room-exit');
  await expect(exit).toBeVisible({ timeout: 20_000 });
  const box = await exit.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
});

test('VTID-04907: Events offers a Live Room in "+" (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bundle = await signIn(page, request);
  expect(bundle, 'the Live Room create option is not in this build').toContain('Geh sofort live oder plane eine Audio- oder Video-Session');

  await page.goto('/comm/events-meetups', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Events/ }).first()).toBeVisible({ timeout: 20_000 });
  await expectNoHorizontalOverflow(page);

  // Opening the dialog is read-only; never pick an option, never submit.
  // The ORB front-door overlay (see allowAbortedWrites) can sit over the page,
  // so the click is dispatched to the button itself rather than at a point.
  const create = page.getByRole('button', { name: 'Erstellen' }).first();
  await expect(create).toBeAttached({ timeout: 20_000 });
  await create.dispatchEvent('click');
  const liveRoom = page.getByTestId('create-option-live-room');
  await expect(liveRoom).toBeAttached({ timeout: 10_000 });
  await expect(liveRoom).toContainText('Live-Raum');
  await expectNoHorizontalOverflow(page);
});

test('VTID-04907: a Live Room is the Live Room card with its CTA and Share (phone)', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  const since = new Date(Date.now() - 2 * 3600_000).toISOString();
  const res = await request.get(
    `${SUPABASE}/rest/v1/community_live_streams?select=id,title,status,scheduled_for&or=(status.eq.live,and(status.eq.pending,scheduled_for.gte.${encodeURIComponent(since)}))&order=scheduled_for.asc&limit=20`,
    { headers: { apikey: signedIn.key, Authorization: `Bearer ${signedIn.token}` } },
  );
  expect(res.status()).toBe(200);
  const rooms = (await res.json()) as Array<{ id: string; title: string }>;
  test.skip(rooms.length === 0, 'no live or scheduled room to show');

  for (const tab of ['hot', 'upcoming']) {
    await page.goto(`/comm/events-meetups?tab=${tab}`, { waitUntil: 'domcontentloaded' });
    const card = page.locator(`[data-event-id="${rooms[0].id}"][data-live-room]`).first();
    await expect(card, `room card on ${tab}`).toBeAttached({ timeout: 20_000 });
    // VTID-04913: the Live Room card (same as the Live Rooms page). Only a room that is
    // live shows the red LIVE badge + Join; a scheduled one shows Notify me. Share is always there.
    const isLive = (await card.getAttribute('data-live-room')) === 'live';
    if (isLive) {
      await expect(card.getByTestId('live-room-badge')).toHaveText('LIVE');
      await expect(card.getByTestId('live-room-card-join')).toBeVisible();
    } else {
      await expect(card.getByTestId('live-room-badge')).toHaveCount(0);
      await expect(card.getByTestId('live-room-card-notify')).toBeVisible();
    }
    await expect(card.getByTestId('live-room-card-share')).toBeAttached();
    await expect(page.getByTestId('events-live-rooms')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await testInfo.attach(`events-${tab}-phone`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});
