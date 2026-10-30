// VTID-05207 — "Say hello" on a New-in-the-community card opens the inline greeting composer (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in token call is the only one
// allowed. The spec taps "Say hello" and asserts the composer opens, then taps Cancel. It never presses
// Send and never sends a message. Opening the composer asks the gateway for a suggestion with a POST; the
// guard aborts it (declared below), so no suggestion is fetched on staging. The Send path (one tagged DM)
// is proven by the vitest suites, which mock the gateway. When the signed-in account sees no new-member
// card, the test is skipped with that reason (same as VTID-04957); it never fakes a pass.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // The app's own read-only POSTs (as in the VTID-05206 spec) plus the composer's suggestion request.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|community\/new-member\/[^/]+\/greeting-suggestion)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
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
}

test('VTID-05207: "Say hello" opens the inline greeting composer and nothing is sent (phone)', async ({ page, request }) => {
  const sends: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' && /\/api\/v1\/chat\/send/.test(r.url())) sends.push(r.url());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  const card = page.getByTestId('new-member-card').first();
  try {
    await expect(card).toBeVisible({ timeout: 25_000 });
  } catch {
    test.skip(true, 'no new-member card in the feed for this account');
  }

  await card.getByRole('button', { name: /say hello|sag hallo/i }).click();
  const composer = page.getByTestId('new-member-greeting-composer');
  await expect(composer).toBeVisible();
  await expect(composer.getByTestId('greeting-text')).toBeVisible();
  await expect(composer.getByTestId('greeting-send')).toBeVisible();
  await expect(page, 'Say hello must not leave the feed').toHaveURL(/\/home/);

  await composer.getByTestId('greeting-cancel').click();
  await expect(composer).toBeHidden();
  expect(sends, 'no message may be sent on staging').toEqual([]);
});
