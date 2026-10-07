// VTID-04959 — group chat header: a visible "edit group" button that opens the
// members panel, real initials instead of "?", and a message box that names
// the group (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The test user is in no legacy group and
// creating one would be a production write, so this spec answers the inbox's
// own GET reads INSIDE the browser: the real response is fetched and one
// made-up group (fake ids, fake people) is appended to it. Nothing is written
// and the guard's rules are not widened.
import type { Page, APIRequestContext, Route } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

const G = '0e5e0000-0000-4000-8000-0000000004f9';
const PEOPLE = [
  { user_id: '0e5e0000-0000-4000-8000-000000000b01', display_name: 'Hanna Probe' },
  { user_id: '0e5e0000-0000-4000-8000-000000000b02', display_name: 'Stefan Probe' },
  { user_id: '0e5e0000-0000-4000-8000-000000000b03', display_name: 'Mila Probe' },
  { user_id: '0e5e0000-0000-4000-8000-000000000b04', display_name: 'Jonas Probe' },
];
const GROUP_NAME = 'Probe-Gruppe Lauftreff am Rhein und Freunde';

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
  return session.user.id as string;
}

async function addFakeGroup(page: Page, me: string) {
  const fakeIds = new Set([G, ...PEOPLE.map((p) => p.user_id)]);
  const mentionsFake = (url: string) => [...fakeIds].some((id) => url.includes(id));
  const participants = [{ user_id: me, role: 'member' }, ...PEOPLE.map((p, i) => ({ user_id: p.user_id, role: i === 0 ? 'admin' : 'member' }))].map((p, i) => ({
    id: `0e5e0000-0000-4000-8000-0000000c000${i}`, thread_id: G, ...p, is_active: true, last_read_at: null,
  }));
  const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const realRows = async (route: Route) => {
    const res = await route.fetch();
    const body = await res.json().catch(() => []);
    return Array.isArray(body) ? body : body ? [body] : [];
  };

  await page.route(/\/rest\/v1\/(global_thread_participants|global_message_threads|global_messages|global_community_profiles|profiles)\?/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fallback();
    const url = decodeURIComponent(req.url());
    const table = new URL(req.url()).pathname.split('/').pop();
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');

    if (table === 'global_thread_participants') {
      if (url.includes(`user_id=eq.${me}`) && !url.includes('thread_id=')) return json(route, [...(await realRows(route)), { thread_id: G, role: 'member', last_read_at: null }]);
      if (url.includes(G)) return json(route, [...(url.includes('thread_id=in.') ? await realRows(route) : []), ...participants]);
      return route.fallback();
    }
    if (table === 'global_message_threads' && url.includes(G)) {
      const now = new Date().toISOString();
      return json(route, [...(url.includes('id=in.') ? await realRows(route) : []), { id: G, name: GROUP_NAME, type: 'group', created_by: PEOPLE[0].user_id, created_at: now, updated_at: now }]);
    }
    if (table === 'global_messages' && url.includes(`thread_id=eq.${G}`)) return json(route, []);
    if ((table === 'global_community_profiles' || table === 'profiles') && mentionsFake(url)) {
      const fakes = PEOPLE.filter((p) => url.includes(p.user_id)).map((p) => ({ ...p, full_name: p.display_name, avatar_url: null }));
      if (single) return json(route, fakes[0] ?? null);
      return json(route, [...(url.includes('user_id=in.') ? await realRows(route) : []), ...fakes]);
    }
    return route.fallback();
  });
}

test('group chat: edit button opens the members panel, initials not "?", message box names the group', async ({ page, request }) => {
  const me = await signIn(page, request);
  await addFakeGroup(page, me);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inbox', { waitUntil: 'domcontentloaded' });

  await page.getByText(GROUP_NAME).first().click();

  const edit = page.getByTestId('edit-group-button');
  await expect(edit).toBeVisible();

  const stack = page.getByTestId('group-avatar-stack');
  await expect(stack).toBeVisible();
  await expect(stack).not.toContainText('?');
  await expect(stack).toContainText('H');

  const box = page.getByPlaceholder(/Probe-Gruppe Lauftreff/);
  await expect(box).toBeVisible();
  await expect(page.getByPlaceholder(/Stefan/)).toHaveCount(0);

  await edit.click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Stefan Probe');
  // The panel must be ON TOP of the full-screen phone chat, not behind it
  // (it opened behind it before: z-50 under the chat's z-[55]).
  const onTop = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(40, r.height / 2));
    return !!hit && el.contains(hit);
  });
  expect(onTop, 'members panel is hidden behind the chat').toBe(true);
  // A long group name must not push the panel wider than the phone screen.
  // (the panel's box fits; its content overflowed inside it and was clipped).
  const overflow = await panel.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow, 'panel content is wider than the panel').toBeLessThanOrEqual(1);
  await expect(page.getByPlaceholder(/……/)).toHaveCount(0);
});
