// VTID-04864 — Wallet › Rewards shows the real VTNA rules on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - the gateway's rule table answers for a signed-in member, with the
//     approved groups and amounts, and never a rule nothing pays;
//   - Wallet › Rewards renders those rules (first steps, habits, never-earns)
//     on a desktop and a phone-sized viewport. Nothing is clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04859 signed-in spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('Wallet › Rewards shows the VTNA rules the system really pays', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  // German is the eagerly bundled catalog.
  expect(bundle, 'the VTNA rules screen is not in this build').toContain('So verdienst du VTNA');

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

  const res = await request.get(`${GATEWAY}/api/v1/wallet/reward-rules`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.unit).toBe('VTNA');
  const groups = body.groups.map((g: { group: string }) => g.group);
  expect(groups.slice(0, 2)).toEqual(['first_steps', 'habits']);
  const rules = body.groups.flatMap((g: { rules: Array<{ id: string; amount: number }> }) => g.rules);
  expect(rules.find((r: { id: string }) => r.id === 'onboarding_complete')?.amount).toBe(50);
  expect(rules.find((r: { id: string }) => r.id === 'diary_streak_30')?.amount).toBe(100);
  expect(body.never_earns).toEqual(['done_by_vitana', 'purchases', 'self_reported']);

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  for (const vp of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/wallet/rewards', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('vtna-reward-rules')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('reward-group-first_steps')).toBeVisible();
    await expect(page.getByTestId('reward-group-habits')).toBeVisible();
    await expect(page.getByTestId('reward-rule-onboarding_complete')).toBeVisible();
    await expect(page.getByTestId('reward-never-earns')).toBeVisible();
    // no horizontal overflow on the phone viewport
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
