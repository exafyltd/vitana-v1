// VTID-04951 — an ended live room says so: chip, notice, and every action
// answers "in the past, not active" (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The calendar
// window is answered inside the browser (page.route) with one demo live room
// that ended earlier today, so no real calendar data is needed and nothing
// reaches the gateway's calendar routes. Nothing is saved or navigated: the
// blocked actions only show a notice.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04912
    // spec) plus every ORB call.
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
    localStorage.setItem('vitana.calendar.view', 'day');
  }, session);
}

function endedRoom() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const start = new Date(day.getTime() + 60_000).toISOString();
  const end = new Date(day.getTime() + 120_000).toISOString();
  const event = {
    id: 'demo-ended', title: 'Demo ended room', description: null, location: null, start_time: start, end_time: end,
    status: 'confirmed', event_type: 'community', source_type: 'live_room', source_ref_type: 'live_room_session', source_ref_id: 's',
    role_context: 'community', completion_status: null, completed_at: null, wellness_tags: null, pillar: null, rrule: null,
    emoji: null, attendees_count: null, metadata: { live_room_id: 'demo-ended-room' },
  };
  return [{ id: 'demo-ended', event_id: 'demo-ended', start_time: start, end_time: end, busy: false, occurrence_index: null, movable: false, reminders: [], event }];
}

test('VTID-04951: an ended live room says so and blocks its actions (phone)', async ({ page, request }) => {
  test.skip(new Date().getHours() === 0 && new Date().getMinutes() < 3, 'the demo room would not have ended yet');
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/calendar/events/window**', (r) => r.fulfill({ json: { ok: true, data: endedRoom(), timezone: 'Europe/Berlin' } }));

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByText('Demo ended room').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  await expect(page.getByTestId('vcal-ended-chip')).toBeVisible();
  await expect(page.getByTestId('vcal-ended-notice')).toBeVisible();

  const url = page.url();
  // The ended-event actions are aria-disabled on purpose (dimmed, still tappable:
  // a tap answers "not active"). Playwright treats aria-disabled="true" as
  // not-enabled and would wait for it forever, so click with force: that is the
  // real tap a member makes, and the point of this check.
  await page.getByTestId('vcal-open-source').click({ force: true });
  // Still on the entry: the tap showed the notice instead of opening the room.
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(page.getByTestId('vcal-complete')).toBeVisible();
  await page.getByTestId('vcal-complete').click({ force: true });
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
