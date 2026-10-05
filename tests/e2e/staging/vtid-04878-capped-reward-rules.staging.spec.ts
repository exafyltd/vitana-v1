// VTID-04878 — Wallet › Rewards shows the three capped VTNA rules the owner
// approved on 2026-10-05 (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - the gateway's rule table lists autopilot_action_done (5, 2 per day),
//     live_room_15min (20, 3 per week) and index_new_best (50, 1 per week),
//     each with its calendar window and the member's count;
//   - Wallet › Rewards renders them with a per-day / per-week cap line on a
//     desktop and a phone-sized viewport, with no raw catalog keys. Nothing is
//     clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04859 signed-in spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('Wallet › Rewards shows the capped Autopilot, live-room and Index rules', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  // German is the eagerly bundled catalog.
  expect(bundle, 'the VTID-04878 Wallet texts are not in this build').toContain('Gewohnheiten – dranbleiben');

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
  const rules = body.groups.flatMap((g: { rules: Array<Record<string, unknown>> }) => g.rules);
  const byId = (id: string) => rules.find((r: { id: string }) => r.id === id);
  expect(byId('autopilot_action_done')).toMatchObject({ amount: 5, window: 'day', cap: { count: 2, days: 1 } });
  expect(byId('live_room_15min')).toMatchObject({ amount: 20, window: 'week', cap: { count: 3, days: 7 } });
  expect(byId('index_new_best')).toMatchObject({ amount: 50, window: 'week', cap: { count: 1, days: 7 } });
  for (const id of ['autopilot_action_done', 'live_room_15min', 'index_new_best']) {
    expect(typeof byId(id).used_in_window).toBe('number');
  }

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  for (const vp of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/wallet/rewards', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('vtna-reward-rules')).toBeVisible({ timeout: 20_000 });
    for (const id of ['autopilot_action_done', 'live_room_15min', 'index_new_best']) {
      const row = page.getByTestId(`reward-rule-${id}`);
      await expect(row).toBeVisible();
      await expect(row).not.toContainText('wallet.rewardRules');
      await expect(page.getByTestId(`reward-rule-cap-${id}`)).toBeVisible();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
