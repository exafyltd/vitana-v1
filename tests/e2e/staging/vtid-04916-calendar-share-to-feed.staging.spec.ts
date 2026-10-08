// VTID-04916 — share a calendar entry to the news feed (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). The calendar
// window, the shared post and its event are answered inside the browser
// (page.route) with demo data, so nothing is shared and no real post or event
// is needed. The share panel is opened and closed, never posted: posting
// writes, and is proven in CI (gateway: test/vtid-04916-calendar-share.test.ts;
// database: scripts/sql-tests/vtid-04916-event-share-posts.test.sql).
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

const EVENT_ID = '00000000-0000-4000-8000-000000000016';
const POST_ID = '00000000-0000-4000-8000-0000000004a1';

function demoItems() {
  const start = new Date(Date.now() + 2 * 3_600_000);
  start.setMinutes(0, 0, 0);
  const s = start.toISOString();
  const e = new Date(start.getTime() + 3_600_000).toISOString();
  const ev = (o: Record<string, unknown>) => ({
    description: null, location: null, status: 'confirmed', role_context: 'community', completion_status: null,
    completed_at: null, wellness_tags: null, pillar: null, rrule: null, emoji: null, attendees_count: null, metadata: null,
    start_time: s, end_time: e, event_type: 'community', source_type: 'community_rsvp',
    source_ref_type: 'community_event', source_ref_id: EVENT_ID, ...o,
  });
  return [
    { id: 'demo-share', event_id: 'demo-share', start_time: s, end_time: e, busy: false, occurrence_index: null, movable: false, reminders: [],
      shareable: true, shared_post_id: null, event: ev({ id: 'demo-share', title: 'Demo shareable event' }) },
    { id: 'demo-shared', event_id: 'demo-shared', start_time: s, end_time: e, busy: false, occurrence_index: null, movable: false, reminders: [],
      shareable: true, shared_post_id: POST_ID, event: ev({ id: 'demo-shared', title: 'Demo shared event' }) },
    { id: 'demo-private', event_id: 'demo-private', start_time: s, end_time: e, busy: false, occurrence_index: null, movable: true, reminders: [],
      shareable: false, shared_post_id: null, event: ev({ id: 'demo-private', title: 'Demo private entry', source_type: 'manual', source_ref_type: null, source_ref_id: null }) },
  ];
}

test('VTID-04916: share a calendar entry to the feed, and the event card on the post (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/calendar/events/window**', (r) => r.fulfill({ json: { ok: true, data: demoItems(), timezone: 'Europe/Berlin' } }));

  // A shareable event: the panel opens prefilled with the event's name, public by default, and closes again.
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.getByText('Demo shareable event').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  await page.getByTestId('vcal-share').click();
  await expect(page.getByTestId('vcal-share-panel')).toBeVisible();
  await expect(page.getByTestId('vcal-share-text')).toHaveValue(/Demo shareable event/);
  await expect(page.getByTestId('vcal-share-public')).toBeChecked();
  await expect(page.getByTestId('vcal-share-post')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('vcal-share-panel').locator('button').first().click(); // cancel
  await expect(page.getByTestId('vcal-share-panel')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Already shared: a link to the post instead of a second share.
  await page.getByText('Demo shared event').first().click();
  await expect(page.getByTestId('vcal-shared-post')).toBeVisible();
  await expect(page.getByTestId('vcal-share')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // A private entry is never shareable.
  await page.getByText('Demo private entry').first().click();
  await expect(page.getByTestId('vcal-entry-screen')).toBeVisible();
  await expect(page.getByTestId('vcal-share')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // The shared post shows the event as a live card that opens the event.
  const startsAt = demoItems()[0].start_time;
  await page.route(`**/rest/v1/profile_posts?*id=eq.${POST_ID}*`, (r) =>
    r.fulfill({ json: {
      id: POST_ID, user_id: '00000000-0000-4000-8000-0000000000aa', content: 'Demo: ich bin dabei',
      image_url: null, video_url: null, background_style: null, mentions: [], likes_count: 0, comments_count: 0,
      is_public: true, created_at: new Date().toISOString(), attached_ref_type: 'community_event', attached_ref_id: EVENT_ID,
    } }));
  await page.route(`**/rest/v1/global_community_events?*id=eq.${EVENT_ID}*`, (r) =>
    r.fulfill({ json: { id: EVENT_ID, title: 'Demo community event', start_time: startsAt, end_time: null, location: 'Demo park' } }));
  await page.goto(`/post/post/${POST_ID}`, { waitUntil: 'domcontentloaded' });
  const card = page.getByTestId('feed-event-card');
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toHaveAttribute('data-state', 'upcoming');
  await expect(card).toContainText('Demo community event');
  await page.getByTestId('feed-event-card-open').click();
  await expect(page).toHaveURL(new RegExp(`/comm/events-meetups\\?event=${EVENT_ID}`));
});
