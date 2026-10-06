// VTID-04926 — @mentions in group chat (read-only).
//
// Owner report 2026-10-06: typing "@stefan" in "Alle Beisammen" did nothing.
// This opens that group as the test user, types "@" plus the start of a real
// member's name, and checks the suggestion list offers them and that picking
// one puts "@Name " into the composer. The composer is cleared afterwards and
// NOTHING is ever sent. './staging-guard' (copied in by the runner) aborts every
// write anyway; the writes listed below are the ones the screen itself makes
// on open (mark-read, presence, signed image links) and are aborted, not sent.
//
// It also checks the two server halves this build depends on:
//   - GET /chat/groups/:id carries `mentionable`, false for the Vitana bot;
//   - the member search (search_mention_candidates, a read-only GET) answers
//     and never offers the caller themself.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/object\/sign\/chat-attachments\/|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('typing @ in the Alle Beisammen group chat suggests and inserts a member', async ({ page, request }) => {
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
  const auth = { Authorization: `Bearer ${session.access_token}` };
  const me = session.user?.id as string;

  // Server half 1: the roster says who may be mentioned.
  const groups = await request.get(`${GATEWAY}/api/v1/chat/groups/`, { headers: auth });
  expect(groups.status()).toBe(200);
  const alle = (((await groups.json()).data ?? []) as Array<{ id: string; name: string }>).find((g) => g.name.startsWith('Alle Beisammen'));
  expect(alle, 'test user is not in Alle Beisammen').toBeTruthy();
  const detail = await request.get(`${GATEWAY}/api/v1/chat/groups/${alle!.id}`, { headers: auth });
  expect(detail.status()).toBe(200);
  const members = ((await detail.json()).data?.members ?? []) as Array<{ user_id: string; display_name: string | null; is_bot: boolean; mentionable?: boolean }>;
  expect(members.every((m) => typeof m.mentionable === 'boolean'), 'gateway does not send `mentionable` yet').toBe(true);
  expect(members.filter((m) => m.is_bot).every((m) => m.mentionable === false)).toBe(true);
  const target = members.find((m) => m.mentionable && m.user_id !== me && (m.display_name ?? '').trim().length >= 3);
  expect(target, 'no mentionable member with a name in the group').toBeTruthy();
  const name = target!.display_name!.trim();

  // Server half 2: the community search answers over GET and never offers the caller.
  const search = await request.get(
    `${SUPABASE}/rest/v1/rpc/search_mention_candidates?p_query=${encodeURIComponent(name.slice(0, 3))}&p_limit=8`,
    { headers: { apikey: key!, ...auth } },
  );
  expect(search.status(), 'search_mention_candidates is not deployed').toBe(200);
  const found = (await search.json()) as Array<{ user_id: string }>;
  expect(Array.isArray(found)).toBe(true);
  expect(found.some((r) => r.user_id === me)).toBe(false);

  // The UI: suggestions appear, picking inserts the name. Never sent.
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/g/${alle!.id}`, { waitUntil: 'domcontentloaded' });

  const composer = page.locator('form#composer textarea');
  await expect(composer).toBeVisible({ timeout: 20_000 });
  await composer.click();
  await composer.pressSequentially(`@${name.slice(0, 3)}`, { delay: 40 });

  const list = page.getByTestId('mention-suggestions');
  await expect(list).toBeVisible({ timeout: 5_000 });
  const option = list.getByTestId('mention-suggestion').filter({ hasText: name }).first();
  await expect(option).toBeVisible();
  await page.screenshot({ path: 'test-results/vtid-04926-mention-suggestions.png' });
  await option.click();

  await expect(composer).toHaveValue(`@${name} `);
  await expect(list).toBeHidden();

  // Leave nothing behind in the composer.
  await composer.fill('');
  await expect(composer).toHaveValue('');
});
