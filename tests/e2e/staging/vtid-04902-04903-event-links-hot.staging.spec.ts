// VTID-04902 / VTID-04903 — event links open the Events screen in the app, and
// the default Hot tab lists member events (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks, on a phone viewport:
//   - /comm/events-meetups?event=<slug> (what a chat event link now opens)
//     resolves the slug, puts the id in the URL and shows that event;
//   - with upcoming events in the catalog, Hot is not empty.
import { test, expect } from './staging-guard';
import type { APIRequestContext, Page } from '@playwright/test';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04859 signed-in spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: Page, request: APIRequestContext) {
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
  return { key: key!, token: session.access_token as string };
}

async function upcomingEvents(request: APIRequestContext, key: string, token: string) {
  const since = new Date(Date.now() + 2 * 3600_000).toISOString();
  const res = await request.get(
    `${SUPABASE}/rest/v1/global_community_events?select=id,slug,title,start_time&start_time=gte.${encodeURIComponent(since)}&order=start_time.asc&limit=50`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` } },
  );
  expect(res.status()).toBe(200);
  return (await res.json()) as Array<{ id: string; slug: string | null; title: string }>;
}

test('an event link (slug) opens that event on the Events screen', async ({ page, request }) => {
  const { key, token } = await signIn(page, request);
  const events = await upcomingEvents(request, key, token);
  const withSlug = events.find((e) => e.slug);
  test.skip(!withSlug, 'no upcoming event with a slug to link to');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/comm/events-meetups?event=${encodeURIComponent(withSlug!.slug!)}`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(`event=${withSlug!.id}`), { timeout: 20_000 });
  await expect(page.getByText(withSlug!.title).first()).toBeVisible({ timeout: 20_000 });
});

test('the default Hot tab lists upcoming member events', async ({ page, request }) => {
  const { key, token } = await signIn(page, request);
  const events = await upcomingEvents(request, key, token);
  test.skip(events.length === 0, 'no upcoming events in the catalog');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/comm/events-meetups', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-event-id]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Keine empfohlenen Events')).toHaveCount(0);
});
