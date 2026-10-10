// VTID-05036 — Admin › Marketplace › Rewards Shop (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - this build carries the screen (its German strings are in the entry
//     bundle, the German catalog being the eagerly bundled one);
//   - the staging gateway answers the three admin GETs the screen reads
//     (items, shipping fees, orders) with 200 for an exafy admin or 403 for
//     anyone else — never a 404/HTML page;
//   - /admin/marketplace/rewards on a phone and a desktop viewport shows one
//     of the states the screen can be in for this account: the three sections
//     (lists or empty states), the "Nur für Exafy-Admins" state, or the app's
//     role gate when the account is not an admin of its tenant — with no raw
//     catalog keys and no horizontal overflow.
// Nothing is saved, uploaded or deleted: no save button is ever clicked.
// Writes are proven by Vitest (RewardsShop.test.tsx) and the gateway's Jest.
import type { Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05024 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

type ScreenState = 'sections' | 'forbidden' | 'role-gate';

async function screenState(page: Page): Promise<ScreenState> {
  const sections = page.getByTestId('reward-admin-sections');
  const forbidden = page.getByTestId('reward-admin-forbidden');
  const gate = page.getByText(/Zugriff verweigert|Access denied/i).first();
  await expect(sections.or(forbidden).or(gate)).toBeVisible({ timeout: 30_000 });
  if (await sections.isVisible()) return 'sections';
  if (await forbidden.isVisible()) return 'forbidden';
  return 'role-gate';
}

async function expectCleanLayout(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text, 'raw catalog key on screen').not.toMatch(/admin\.rewardsShop\.|\[\[missing:/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1);
}

test('Admin › Rewards Shop renders on phone and desktop without writing anything', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  // Two viewports × three sections, each waiting on the staging gateway.
  test.setTimeout(180_000);

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  expect(bundle, 'the VTID-05036 admin texts are not in this build').toContain('Nur für Exafy-Admins');
  expect(bundle).toContain('Prämien-Shop verwalten');

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

  // The three reads the screen makes: exafy admin → 200 { ok: true }, anyone else → 403 JSON.
  for (const path of ['/api/v1/admin/rewards/items', '/api/v1/admin/rewards/shipping-fees', '/api/v1/admin/rewards/orders']) {
    const res = await request.get(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    expect([200, 403], `${path} → ${res.status()}`).toContain(res.status());
    expect(res.headers()['content-type'] ?? '', `${path} must answer JSON`).toContain('application/json');
    const body = await res.json();
    if (res.status() === 200) expect(body.ok, path).toBe(true);
    else expect(body.error, path).toBe('FORBIDDEN');
  }

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    // The admin route is gated on the DB role (useRole → get_role_preference),
    // not on this key; it is set so the shell renders its admin chrome.
    localStorage.setItem('vitana.viewRole', 'admin');
  }, session);

  for (const viewport of [{ width: 390, height: 844 }, { width: 1400, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/admin/marketplace/rewards', { waitUntil: 'domcontentloaded' });
    const state = await screenState(page);
    test.info().annotations.push({ type: 'state', description: `${viewport.width}x${viewport.height}: ${state}` });

    if (state === 'sections') {
      // Items list or its empty state.
      await expect(page.getByTestId('reward-admin-items')).toBeVisible();
      const switchTo = async (s: 'fees' | 'orders') => {
        if (viewport.width < 1024) await page.getByTestId('reward-admin-section-select').selectOption(s);
        else await page.getByTestId(`reward-admin-tab-${s}`).click();
      };
      await expectCleanLayout(page);
      await switchTo('fees');
      await expect(page.getByTestId('reward-admin-fees')).toBeVisible();
      await expect(page.getByTestId('reward-admin-fees-empty').or(page.locator('tr[data-testid^="reward-admin-fee-"]').first())).toBeVisible();
      await expectCleanLayout(page);
      await switchTo('orders');
      await expect(page.getByTestId('reward-admin-orders')).toBeVisible();
      await expect(
        page.getByTestId('reward-admin-orders-empty').or(page.locator('[data-testid^="reward-admin-order-"]').first()),
      ).toBeVisible({ timeout: 20_000 });
      await expectCleanLayout(page);
    } else {
      await expectCleanLayout(page);
    }
  }
});
