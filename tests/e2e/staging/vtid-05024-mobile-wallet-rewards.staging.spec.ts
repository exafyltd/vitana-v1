// VTID-05024 — the mobile Wallet's way into Rewards (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. On a phone-sized viewport:
//   - the Wallet's mode pill lists "Rewards" and tapping it opens
//     /wallet/rewards with the Shop tab and a back link, without the desktop
//     tab bar;
//   - /wallet?tab=rewards (Vitana's deep link) lands on the same screen;
//   - the back link returns to /wallet.
// Nothing is redeemed or written.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04983 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

test('mobile Wallet → Rewards pill, deep link and back link', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  expect(bundle, 'the VTID-05024 labels are not in this build').toContain('Zurück zur Wallet');

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

  const expectRewardsScreen = async () => {
    await expect(page).toHaveURL(/\/wallet\/rewards/, { timeout: 20_000 });
    await expect(page.getByTestId('rewards-back-to-wallet')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('tab', { name: /Prämien-Shop|Rewards shop|Shop/i }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  };

  // 1. The mode pill (shows the active mode, "Guthaben"/"Balances") opens a sheet with "Rewards".
  await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Guthaben|Balances/ }).first().click({ timeout: 20_000 });
  await page.getByRole('button', { name: /Belohnungen|Rewards/ }).last().click();
  await expectRewardsScreen();

  // 2. The back link returns to the Wallet.
  await page.getByTestId('rewards-back-to-wallet').click();
  await expect(page).toHaveURL(/\/wallet(\?|$)/);

  // 3. Vitana's deep link.
  await page.goto('/wallet?tab=rewards', { waitUntil: 'domcontentloaded' });
  await expectRewardsScreen();
});
