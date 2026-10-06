// VTID-04915 — calendar entry actions, the entry deep link, and /reminders
// without the retired popup (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The calendar
// window is answered inside the browser (page.route) with three demo entries,
// so no real calendar data is needed and nothing reaches the gateway's
// calendar routes. Nothing is saved: the edit form and the remove question
// are opened and closed, never confirmed.
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

function demoItems() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const at = (h: number) => new Date(day.getTime() + h * 3_600_000).toISOString();
  const soon = new Date(Date.now() + 10 * 60_000).toISOString();
  const later = new Date(Date.now() + 70 * 60_000).toISOString();
  const ev = (o: Record<string, unknown>) => ({
    description: null, location: null, end_time: null, status: 'confirmed', source_ref_type: null, source_ref_id: null,
    role_context: 'community', completion_status: null, completed_at: null, wellness_tags: null, pillar: null, rrule: null,
    emoji: null, attendees_count: null, metadata: null, ...o,
  });
  return [
    { id: 'demo-own', event_id: 'demo-own', start_time: at(23), end_time: at(23.5), busy: false, occurrence_index: null, movable: true, reminders: [],
      event: ev({ id: 'demo-own', title: 'Demo own entry', start_time: at(23), end_time: at(23.5), event_type: 'personal', source_type: 'manual' }) },
    { id: 'demo-event', event_id: 'demo-event', start_time: at(22), end_time: at(23), busy: false, occurrence_index: null, movable: false, reminders: [],
      event: ev({ id: 'demo-event', title: 'Demo community event', start_time: at(22), end_time: at(23), event_type: 'community', source_type: 'community_rsvp', source_ref_type: 'community_event', source_ref_id: '00000000-0000-4000-8000-000000000001' }) },
    { id: 'demo-room', event_id: 'demo-room', start_time: soon, end_time: later, busy: false, occurrence_index: null, movable: false, reminders: [],
      event: ev({ id: 'demo-room', title: 'Demo live room', start_time: soon, end_time: later, event_type: 'community', source_type: 'live_room', source_ref_type: 'live_room_session', source_ref_id: 's', metadata: { live_room_id: 'demo-room-id' } }) },
  ];
}

test('VTID-04915: calendar entry actions, deep link and /reminders (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/calendar/events/window**', (r) => r.fulfill({ json: { ok: true, data: demoItems(), timezone: 'Europe/Berlin' } }));
  // The deep link reads the entry's start time; answer for the demo id only.
  await page.route('**/rest/v1/calendar_events?*id=eq.demo-own*', (r) =>
    r.fulfill({ json: { start_time: demoItems()[0].start_time } }));

  // Own entry: edit and remove are offered; the form and the question open and close.
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByText('Demo own entry').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  await page.getByTestId('vcal-edit').click();
  await expect(page.getByTestId('vcal-edit-form')).toBeVisible();
  await expect(page.getByTestId('vcal-edit-title')).toHaveValue('Demo own entry');
  await page.getByTestId('vcal-edit-form').locator('button').first().click();
  await page.getByTestId('vcal-remove').click();
  await expect(page.getByTestId('vcal-remove-confirm')).toBeVisible();
  await page.keyboard.press('Escape');

  // Community event entry: no edit/remove, a way back to the event.
  await page.getByText('Demo community event').first().click();
  await expect(page.getByTestId('vcal-open-source')).toBeVisible();
  await expect(page.getByTestId('vcal-edit')).toHaveCount(0);
  await expect(page.getByTestId('vcal-remove')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Live room starting in 10 minutes: joinable.
  await page.getByText('Demo live room').first().click();
  await expect(page.getByTestId('vcal-open-source')).toBeVisible();
  await page.keyboard.press('Escape');

  // Deep link opens the entry directly.
  await page.goto('/calendar/entry/demo-own', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible({ timeout: 30_000 });

  // /reminders is the list inside the app shell (the popup is retired).
  await page.goto('/reminders', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('reminders-page')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
