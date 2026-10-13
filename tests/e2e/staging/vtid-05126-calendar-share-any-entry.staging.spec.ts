// VTID-05126 — share any of my upcoming calendar entries (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The calendar
// window is answered inside the browser (page.route) with a demo reminder —
// the kind of entry that had neither Share nor Invite before this change.
// The share panel is opened, the card title is edited and the place switch
// is toggled; the preview follows. Nothing is posted and no invite is sent:
// a post reaches the whole community and an invite reaches a real person, so
// both are proven in CI (gateway: test/vtid-05126-calendar-share-any-entry.test.ts,
// test/vtid-04918-calendar-assistant-parity.test.ts; app:
// ShareAnyEntry.vtid-05126.test.tsx, InviteToChatSheet.test.tsx; database:
// scripts/sql-tests/vtid-05126-calendar-entry-share.test.sql).
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
  const start = new Date(Date.now() + 22 * 24 * 3_600_000);
  start.setMinutes(0, 0, 0);
  const s = start.toISOString();
  const e = new Date(start.getTime() + 15 * 60_000).toISOString();
  return [
    { id: 'demo-reminder', event_id: 'demo-reminder', start_time: s, end_time: e, busy: false, occurrence_index: null, movable: false, reminders: [],
      shareable: true, invitable: true, sensitive: false, shared_post_id: null,
      event: {
        id: 'demo-reminder', title: 'Erinnerung: Geburtstag von Demo Person', description: null, location: 'Demo-Straße 1',
        start_time: s, end_time: e, event_type: 'personal', status: 'confirmed', source_type: 'reminder', source_ref_type: 'reminder',
        source_ref_id: 'demo', role_context: 'community', completion_status: null, completed_at: null, wellness_tags: null, pillar: null,
        rrule: null, emoji: '🎂', attendees_count: null, metadata: null,
      } },
  ];
}

test('VTID-05126: a reminder can be shared and invited to; the card is the member\'s choice (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/calendar/events/window**', (r) => r.fulfill({ json: { ok: true, data: demoItems(), timezone: 'Europe/Berlin' } }));
  await page.route('**/api/v1/chat/conversations**', (r) => r.fulfill({ json: { ok: true, data: [] } }));
  await page.route('**/api/v1/chat/groups/', (r) => r.fulfill({ json: { ok: true, data: [] } }));

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByText('Erinnerung: Geburtstag von Demo Person').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();

  // Both buttons on a reminder.
  await expect(page.getByTestId('vcal-invite')).toBeVisible();
  await page.getByTestId('vcal-share').click();
  await expect(page.getByTestId('vcal-share-panel')).toBeVisible();

  // Rename the card; the place stays hidden until switched on; the preview follows.
  const title = page.getByTestId('vcal-share-card-title');
  await expect(title).toHaveValue('Erinnerung: Geburtstag von Demo Person');
  await title.fill('Demos Geburtstag');
  const preview = page.getByTestId('vcal-share-preview');
  await expect(preview).toContainText('Demos Geburtstag');
  await expect(preview).not.toContainText('Demo-Straße');
  await page.getByTestId('vcal-share-location').check();
  await expect(preview).toContainText('Demo-Straße 1');
  await expect(page.getByTestId('vcal-share-post')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Never posted: a post reaches the whole community (proven in CI).

  // The invite sheet offers the same card choices; nothing is sent.
  await page.keyboard.press('Escape');
  await page.getByText('Erinnerung: Geburtstag von Demo Person').first().click();
  await page.getByTestId('vcal-invite').click();
  await expect(page.getByTestId('vcal-invite-sheet')).toBeVisible();
  await expect(page.getByTestId('vcal-invite-card-title')).toHaveValue('Erinnerung: Geburtstag von Demo Person');
  await expect(page.getByTestId('vcal-invite-location')).not.toBeChecked();
  await expect(page.getByTestId('vcal-invite-send')).toBeDisabled();
});
