// VTID-05732 — in a direct thread the message rows reserve no avatar column, so incoming
// bubbles sit flush left and own bubbles flush right (avatars are hidden in direct threads,
// VTID-05584). Read-only: every non-GET request is aborted except the sign-in call.
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const SIGN_IN = `${SUPABASE}/auth/v1/token?grant_type=password`;

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const req = route.request();
    const isSignIn = req.url() === SIGN_IN && req.method() === 'POST';
    const isGet = req.method() === 'GET' || req.method() === 'HEAD' || req.method() === 'OPTIONS';
    if (isGet || isSignIn) return route.continue();
    return route.abort();
  });
});

async function signIn(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const bundleUrl = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(bundleUrl)).text();
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
    await request.post(SIGN_IN, { headers: { apikey: key!, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  return { access_token: session.access_token as string, apikey: key! };
}

test('a direct thread has no avatar column: incoming bubbles start at the left edge, own bubbles end at the right edge', async ({ page, request }) => {
  const { access_token } = await signIn(page, request);

  // Read-only: the test user's own direct conversations, as the inbox lists them. The community
  // inbox renders direct chats from chat_messages keyed by peer (route /inbox/u/:peerId); the
  // legacy message_threads rows are not what it shows, so the spec must open a peer conversation.
  const res = await request.get(`${GATEWAY}/api/v1/chat/conversations?limit=5`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  expect(res.status()).toBe(200);
  const peers = (((await res.json()) as { data?: Array<{ peer_id: string }> }).data ?? []);
  test.skip(peers.length === 0, 'the test user has no direct conversation to check');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/u/${peers[0].peer_id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="msg-"]').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);

  const layout = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>('[id^="msg-"]')];
    const list = rows[0]?.parentElement?.getBoundingClientRect();
    const avatarColumns = rows.reduce((n, r) => n + r.querySelectorAll('div.w-8.flex').length, 0);
    const edges = rows.map((r) => {
      const b = r.getBoundingClientRect();
      return { left: Math.round(b.left - (list?.left ?? 0)), right: Math.round((list?.right ?? 0) - b.right) };
    });
    return { count: rows.length, avatarColumns, edges };
  });

  expect(layout.count, 'no message rows rendered').toBeGreaterThan(0);
  expect(layout.avatarColumns, 'a direct thread reserves an avatar column').toBe(0);
  // Flush: each row sits at one edge of the list, with no 32px indent on the incoming side.
  for (const e of layout.edges) {
    expect(Math.min(e.left, e.right), `row not flush to either edge: left ${e.left}px, right ${e.right}px`).toBeLessThanOrEqual(16);
  }
});
