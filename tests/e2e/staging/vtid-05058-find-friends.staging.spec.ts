// VTID-05058 — "Find friends" on /invite (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844). Headless
// Chromium has no Contact Picker and no native app shell, so the flow shows
// the .vcf path — the same screen an iPhone or the store app's WebView gets.
// Nothing is imported: importing writes to the shared database.
// GET /api/v1/invites/me creates the member's link on first use, so this spec
// answers it inside the browser (page.route); no request reaches the gateway.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04864 spec)
    // plus the Live Rooms list's read RPC for "Notify me" counts, and every
    // ORB call: /comm/events-meetups is a MAXINA front-door route, so the
    // Vitana ORB opens on its own (useOrbFrontDoor) and starts a voice
    // session — those POSTs are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_live_stream_subscriber_counts|get_live_stream_subscribers)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
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
  }, session);
  signedIn = { key: key!, token: session.access_token as string };
  return bundle;
}

let signedIn: { key: string; token: string } = { key: '', token: '' };


test('VTID-05058: Invite friends shows the personal link and the one-tap contacts flow (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/invites/me', (r) =>
    r.fulfill({ json: { ok: true, code: 'DEMO1234', url: 'https://vitanaland.com/i/DEMO1234' } }));

  await page.goto('/invite', { waitUntil: 'domcontentloaded' });
  const linkCard = page.getByTestId('invite-link-card');
  await expect(linkCard).toBeVisible({ timeout: 20_000 });
  await expect(linkCard).toContainText('https://vitanaland.com/i/DEMO1234');

  await page.getByTestId('find-friends-button').first().click();
  // First time: the consent card (stored in this browser only). Continue past it.
  const consent = page.getByRole('button', { name: /weiter|continue/i });
  if (await consent.isVisible().catch(() => false)) await consent.click();

  const fileButton = page.getByTestId('find-friends-file');
  await expect(fileButton).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/iPhone/)).toBeVisible();
  await expect(page.getByText(/Android/)).toBeVisible();
  // The account sources stay one tap away; the phone tile is not shown twice.
  await expect(page.getByTestId('find-friends-source-google')).toBeVisible();
  await expect(page.getByTestId('find-friends-source-phonebook')).toHaveCount(0);

  // No horizontal overflow on a phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.keyboard.press('Escape');
  await expect(fileButton).toHaveCount(0);
});
