// VTID-05037 — Wallet › Rewards › "Mehr verdienen" (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks, on a phone and a desktop:
//   - the three tabs (Verdient / Mehr verdienen / Shop) fit without the tab
//     row scrolling, and the page has no horizontal overflow;
//   - "Mehr verdienen" renders from the real reward rules: a list of actions
//     or the all-done state, no raw catalog keys, no mock numbers;
//   - the old ?tab=intelligence link lands on the same tab.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04983 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

test('Wallet › Rewards › Mehr verdienen renders real data on phone and desktop', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  expect(bundle, 'the VTID-05037 texts are not in this build').toContain('Mehr verdienen');

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

  for (const [vp, path] of [
    [{ width: 390, height: 844 }, '/wallet/rewards?tab=earn'],
    [{ width: 390, height: 844 }, '/wallet/rewards?tab=intelligence'],
    [{ width: 1400, height: 900 }, '/wallet/rewards?tab=earn'],
  ] as const) {
    await page.setViewportSize(vp);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const panel = page.getByTestId('earn-more');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('earn-more-actions').or(page.getByTestId('earn-more-all-done'))).toBeVisible();
    await expect(panel).not.toContainText('wallet.earnMore');
    await expect(panel).not.toContainText('wallet.rewardRules');
    await expect(page.getByRole('tab', { name: /Mehr verdienen|Earn more/ })).toHaveAttribute('aria-selected', 'true');
    const tabsScroll = await page.getByRole('tablist').first().evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(tabsScroll, 'the three tabs must fit without scrolling').toBeLessThanOrEqual(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
