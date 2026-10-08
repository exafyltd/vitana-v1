// VTID-04928 — a group chat lands where the member expects, whichever element
// scrolls (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The aborted requests listed below are the
// app's own read-only POSTs (mark-read, telemetry, attachment signed URLs —
// same list as the VTID-04921/04924 spec). The reactions lookup
// (rpc/get_message_reactions_text) is a SELECT-only PostgREST read that
// PostgREST sends as POST; this spec answers it INSIDE the browser with an
// empty list (page.route → fulfill), so it never leaves the page — the guard's
// rules are not widened. Nothing is written anywhere.
//
// Phone viewport. Three cases:
//   1. a normal open rests on the newest message;
//   2. the same with the page root forced to height:auto, so the DOCUMENT is
//      what scrolls (the Android app webview condition VTID-04921 missed);
//   3. a push-notification deep link /inbox/g/<id>/msg/<messageId> to an
//      older message lands on that message.
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/object\/sign\/chat-attachments\/|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

async function signInToAlle(page: Page, request: APIRequestContext) {
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
  const groups = await request.get(`${GATEWAY}/api/v1/chat/groups/`, { headers: auth });
  expect(groups.status()).toBe(200);
  const list = ((await groups.json()).data ?? []) as Array<{ id: string; name: string }>;
  const alle = list.find((g) => g.name.startsWith('Alle Beisammen'));
  expect(alle, 'test user is not in Alle Beisammen').toBeTruthy();

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // Reactions lookup: a read sent as POST — answered here, never sent.
  await page.route(/\/rest\/v1\/rpc\/get_message_reactions_text/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  return { groupId: alle!.id, auth };
}

/** The element is on screen and not hidden under the sticky composer. */
async function expectOnScreen(page: Page, selector: string) {
  await expect
    .poll(async () => page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const footer = document.querySelector('footer');
      if (!el || !footer) return 'missing';
      const r = el.getBoundingClientRect();
      const visibleBottom = Math.min(window.innerHeight, footer.getBoundingClientRect().top);
      return r.bottom > 60 && r.top < visibleBottom ? 'visible' : `off-screen top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} limit=${Math.round(visibleBottom)}`;
    }, selector), { timeout: 15_000 })
    .toBe('visible');
}

test('a normal open rests on the newest message', async ({ page, request }) => {
  const { groupId } = await signInToAlle(page, request);
  await page.goto(`/inbox/g/${groupId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="msg-"]').first()).toBeAttached({ timeout: 20_000 });
  const lastId = await page.locator('[id^="msg-"]').last().getAttribute('id');
  await expectOnScreen(page, `#${lastId}`);
});

test('the newest message is on screen when the document is what scrolls (app webview)', async ({ page, request }) => {
  const { groupId } = await signInToAlle(page, request);
  await page.addInitScript(() => {
    const css = 'div[class~="h-[100dvh]"]{height:auto !important}';
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    });
  });
  await page.goto(`/inbox/g/${groupId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="msg-"]').first()).toBeAttached({ timeout: 20_000 });
  expect(
    await page.evaluate(() => (document.scrollingElement?.scrollHeight ?? 0) > window.innerHeight),
    'the page itself must overflow for this case to mean anything',
  ).toBe(true);
  const lastId = await page.locator('[id^="msg-"]').last().getAttribute('id');
  await expectOnScreen(page, `#${lastId}`);
});

test('a push deep link lands on that message', async ({ page, request }) => {
  const { groupId, auth } = await signInToAlle(page, request);
  const res = await request.get(`${GATEWAY}/api/v1/chat/groups/${groupId}/messages?limit=20`, { headers: auth });
  expect(res.status()).toBe(200);
  const msgs = ((await res.json()).data ?? []) as Array<{ id: string }>; // newest first
  test.skip(msgs.length < 12, 'not enough messages to pick an older target');
  const target = msgs[10].id;
  await page.goto(`/inbox/g/${groupId}/msg/${target}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(`#msg-${target}`)).toBeAttached({ timeout: 20_000 });
  await expectOnScreen(page, `#msg-${target}`);
});
