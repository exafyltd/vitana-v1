// VTID-04983 — Wallet › Rewards › Shop (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - the staging gateway serves GET /api/v1/rewards/shop (VTID-04982) with the
//     member's earned balance, the items and the shipping fees;
//   - Wallet › Rewards has the Shop tab and renders the shop (items, or the
//     empty state while none are listed) on a desktop and a phone-sized
//     viewport, with no raw catalog keys and no horizontal overflow. Nothing
//     is redeemed; the redeem path is covered by Vitest and the gateway tests.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04859 signed-in spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('Wallet › Rewards › Shop renders the shop from the gateway', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  // German is the eagerly bundled catalog.
  expect(bundle, 'the VTID-04983 shop texts are not in this build').toContain('Prämien-Shop');

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

  const res = await request.get(`${GATEWAY}/api/v1/rewards/shop`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.items)).toBe(true);
  expect(Array.isArray(body.shipping_fees)).toBe(true);
  expect(typeof body.earned_balance).toBe('number');
  expect(body.eur_per_vtna).toBe(0.01);

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  for (const vp of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/wallet/rewards?tab=shop', { waitUntil: 'domcontentloaded' });
    const shop = page.getByTestId('reward-shop');
    await expect(shop).toBeVisible({ timeout: 20_000 });
    await expect(shop).not.toContainText('wallet.rewardShop');
    if (body.items.length === 0) await expect(page.getByTestId('reward-shop-empty')).toBeVisible();
    else await expect(page.getByTestId(`reward-shop-item-${body.items[0].slug}`)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
