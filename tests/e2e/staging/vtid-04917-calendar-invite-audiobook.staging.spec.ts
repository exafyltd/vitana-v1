// VTID-04917 — invite someone from the calendar, and the audiobook entry (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The calendar
// window and the chat list are answered inside the browser (page.route) with
// demo data. The invite picker is opened, a demo group is picked and the
// sheet is closed — the invite is never sent: sending writes a chat message
// to real people, and is proven in CI (gateway:
// test/vtid-04917-calendar-invite-audiobook.test.ts and
// test/vtid-04917-invite-routes.test.ts; app: InviteToChatSheet.test.tsx and
// CalendarInviteCard.test.tsx).
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

const GROUP_ID = '00000000-0000-4000-8000-0000000049a1';

function demoItems() {
  const start = new Date(Date.now() + 26 * 3_600_000);
  start.setMinutes(0, 0, 0);
  const s = start.toISOString();
  const e = new Date(start.getTime() + 3_600_000).toISOString();
  const later = new Date(Date.now() + 2 * 3_600_000);
  later.setMinutes(0, 0, 0);
  const ev = (o: Record<string, unknown>) => ({
    description: null, location: null, status: 'confirmed', role_context: 'community', completion_status: null,
    completed_at: null, wellness_tags: null, pillar: null, rrule: null, emoji: null, attendees_count: null, metadata: null,
    source_ref_type: null, source_ref_id: null, ...o,
  });
  return [
    { id: 'demo-own', event_id: 'demo-own', start_time: s, end_time: e, busy: false, occurrence_index: null, movable: true, reminders: [],
      shareable: false, shared_post_id: null,
      event: ev({ id: 'demo-own', title: 'Demo own plan', start_time: s, end_time: e, event_type: 'personal', source_type: 'manual' }) },
    { id: 'demo-audiobook::1', event_id: 'demo-audiobook', start_time: later.toISOString(),
      end_time: new Date(later.getTime() + 20 * 60_000).toISOString(), busy: false, occurrence_index: 1, movable: false, reminders: [],
      display_emoji: '🎧',
      event: ev({ id: 'demo-audiobook', title: 'Audiobook', start_time: later.toISOString(), event_type: 'wellness_nudge',
        source_type: 'audiobook', source_ref_type: 'audiobook_reminder', rrule: 'FREQ=DAILY', emoji: '🎧' }) },
  ];
}

test('VTID-04917: invite from the calendar, and the audiobook entry (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/calendar/events/window**', (r) => r.fulfill({ json: { ok: true, data: demoItems(), timezone: 'Europe/Berlin' } }));
  await page.route('**/api/v1/chat/conversations**', (r) => r.fulfill({ json: { ok: true, data: [] } }));
  await page.route('**/api/v1/chat/groups/', (r) =>
    r.fulfill({ json: { ok: true, data: [{ id: GROUP_ID, tenant_id: 't', name: 'Demo walking group', description: null, is_system: false, metadata: {}, created_at: new Date().toISOString() }] } }));

  // The member's own plan: Invite opens the picker; a group can be picked; nothing is sent.
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByText('Demo own plan').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  await page.getByTestId('vcal-invite').click();
  const sheet = page.getByTestId('vcal-invite-sheet');
  await expect(sheet).toBeVisible();
  const send = page.getByTestId('vcal-invite-send');
  await expect(send).toBeDisabled();
  await sheet.getByText('Demo walking group').click();
  await expect(send).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); // closes the sheet without sending
  await expect(sheet).toHaveCount(0);
  await page.keyboard.press('Escape');

  // The daily audiobook entry: "Listen now", no "mark done", no invite. Not
  // tapped here: the player starts playback (proven in InviteToChatSheet.test.tsx).
  await page.getByText(/Hörbuch|Audiobook/).first().click();
  await expect(page.getByTestId('vcal-listen')).toBeVisible();
  await expect(page.getByTestId('vcal-complete')).toHaveCount(0);
  await expect(page.getByTestId('vcal-invite')).toHaveCount(0);
});
