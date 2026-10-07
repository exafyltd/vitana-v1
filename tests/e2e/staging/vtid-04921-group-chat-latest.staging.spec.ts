// VTID-04921 — a group chat opens at its NEWEST message (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The group screen's own "mark read" POST
// is aborted by the guard (listed below) — nothing is sent. So are the signed-URL
// POSTs the chat makes for its image attachments (`/storage/v1/object/sign/chat-attachments/…`,
// ~40 of them): creating a signed link reads and writes nothing, and the guard aborts
// the request, so it is listed here as expected rather than failing the run. On a phone
// viewport, opening "Alle Beisammen" must leave the scroll area at the bottom
// with the last message on screen, not at the oldest message.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/object\/sign\/chat-attachments\/|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('the Alle Beisammen group chat opens at the latest message', async ({ page, request }) => {
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

  const groups = await request.get(`${GATEWAY}/api/v1/chat/groups/`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(groups.status()).toBe(200);
  const list = ((await groups.json()).data ?? []) as Array<{ id: string; name: string }>;
  const alle = list.find((g) => g.name.startsWith('Alle Beisammen'));
  expect(alle, 'test user is not in Alle Beisammen').toBeTruthy();

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // VTID-04928: the reactions lookup (rpc/get_message_reactions_text) is a
  // SELECT-only read PostgREST sends as POST. Answered here inside the browser
  // with an empty list, so it never leaves the page — the guard is unchanged
  // (same as vtid-04928-group-chat-lands.staging.spec.ts).
  await page.route(/\/rest\/v1\/rpc\/get_message_reactions_text/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/g/${alle!.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="msg-"]').first()).toBeVisible({ timeout: 20_000 });

  const main = page.locator('main');
  // The chat is long enough to scroll, and it rests at the bottom (allowing a
  // few px of rounding / a late avatar), not at scrollTop 0.
  await expect
    .poll(async () => main.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop), { timeout: 10_000 })
    .toBeLessThan(40);
  expect(await main.evaluate((el) => el.scrollHeight > el.clientHeight), 'chat should overflow').toBe(true);

  // The last message is inside the visible scroll area.
  const last = page.locator('[id^="msg-"]').last();
  const lb = await last.boundingBox();
  const mb = await main.boundingBox();
  expect(lb && mb).toBeTruthy();
  expect(lb!.y + lb!.height).toBeLessThanOrEqual(mb!.y + mb!.height + 2);
  expect(lb!.y + lb!.height).toBeGreaterThan(mb!.y);
});
