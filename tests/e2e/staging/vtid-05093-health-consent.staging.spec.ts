// VTID-05093 — Health Hub D10 (WP2) on staging (read-only): Settings › Privacy
// health consent switches bound to the gateway's consent records.
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - GET /api/v1/health/consents without a token answers 401 JSON (not HTML);
//   - with the test user it answers 200 JSON { ok, store_pending, categories,
//     consents, partners, connectors } in the VTID-05092 shape;
//   - Settings › Privacy › Data Sharing renders the two health switches in the
//     state the gateway reports: on only for an active consent, otherwise off
//     and disabled (the consent wording ships as a draft, so nothing can be
//     granted from this build), plus the "Manage connected sources" row;
//   - the sources dialog lists every partner and wearable connector the gateway
//     returns, with no grant possible; it is closed without any action;
//   - desktop, phone (390×844) and a right-to-left layout (dir=rtl forced on
//     the document — switching the app language would write the member's
//     language preference) are captured;
//   - no non-GET request ever reaches /api/v1/health/consents.
// GETs, navigation and opening/closing a list dialog only — nothing is granted
// or withdrawn.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05032 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const CONSENTS = '/api/v1/health/consents';

const SWITCHES: Record<string, RegExp> = {
  health_data_analytics: /^(Gesundheitsdaten-Analyse|Health Data Analytics)$/,
  community_insights: /^(Community-Einblicke|Community Insights)$/,
};
const MANAGE = /^(Verwalten|Manage)$/;
const ALLOW = /^(Erlauben|Allow)$/;

type ConsentRow = { category: string; resource_id: string; active: boolean };

test('privacy health consent switches reflect the gateway, read-only', async ({ page, request }, testInfo) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  // 1. Unauthenticated: a JSON 401, never the SPA's HTML.
  const anon = await request.get(`${GATEWAY}${CONSENTS}`);
  expect(anon.status()).toBe(401);
  expect(anon.headers()['content-type'] ?? '').toContain('application/json');

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

  // 2. The gateway's own answer (GET only), VTID-05092 shape.
  const res = await request.get(`${GATEWAY}${CONSENTS}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type'] ?? '').toContain('application/json');
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.store_pending).toBe('boolean');
  for (const k of ['categories', 'consents', 'partners', 'connectors']) expect(Array.isArray(body[k]), `${k} is not an array`).toBe(true);
  for (const c of body.categories as Record<string, unknown>[]) {
    expect(typeof c.key).toBe('string');
    expect(typeof c.current_text_version).toBe('string');
    expect(typeof c.per_resource).toBe('boolean');
  }
  for (const c of body.consents as Record<string, unknown>[]) {
    expect(typeof c.category).toBe('string');
    expect(typeof c.resource_id).toBe('string');
    expect(typeof c.active).toBe('boolean');
  }
  for (const p of body.partners as Record<string, unknown>[]) expect(typeof p.partner_key).toBe('string');
  for (const c of body.connectors as Record<string, unknown>[]) expect(typeof c.id).toBe('string');
  const active = (category: string) =>
    (body.consents as ConsentRow[]).some((c) => c.category === category && c.resource_id === category && c.active === true);

  // Any write to the consent API would be a failure.
  const writes: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes(CONSENTS) && req.method() !== 'GET') writes.push(`${req.method()} ${req.url()}`);
  });

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // 3. Settings › Privacy › Data Sharing (desktop).
  await page.setViewportSize({ width: 1400, height: 900 });
  const consentsLoaded = page.waitForResponse((r) => r.url().includes(CONSENTS) && r.request().method() === 'GET', { timeout: 30_000 });
  await page.goto('/settings/privacy?section=data', { waitUntil: 'domcontentloaded' });
  await consentsLoaded;
  await page.waitForTimeout(1_000);

  for (const [category, name] of Object.entries(SWITCHES)) {
    const sw = page.getByRole('switch', { name });
    await expect(sw, category).toBeVisible({ timeout: 30_000 });
    if (active(category)) {
      // An active consent is on and can always be withdrawn.
      await expect(sw, category).toHaveAttribute('aria-checked', 'true');
      await expect(sw, category).toBeEnabled();
    } else {
      // No record (or store pending / draft wording in this build): off and disabled.
      await expect(sw, category).toHaveAttribute('aria-checked', 'false');
      await expect(sw, category).toBeDisabled();
    }
  }
  const manageRow = page.getByTestId('health-consent-manage-sources');
  await expect(manageRow).toBeVisible();
  await testInfo.attach('privacy-desktop', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  // 4. The sources list: every partner + connector, nothing grantable. Close without acting.
  await manageRow.getByRole('button', { name: MANAGE }).click();
  const dialog = page.getByTestId('health-consent-sources-dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const items = dialog.getByTestId('health-consent-source');
  expect(await items.count()).toBeGreaterThanOrEqual((body.partners as unknown[]).length + (body.connectors as unknown[]).length);
  const allows = dialog.getByRole('button', { name: ALLOW });
  for (let i = 0; i < (await allows.count()); i++) await expect(allows.nth(i)).toBeDisabled();
  await testInfo.attach('privacy-sources-desktop', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // 5. Phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/privacy?section=data', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('switch', { name: SWITCHES.health_data_analytics })).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  testInfo.annotations.push({ type: 'phone-horizontal-overflow-px', description: String(overflow) });
  await testInfo.attach('privacy-mobile', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  // 6. Right to left (layout only; the member's language is not changed).
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
  await page.waitForTimeout(500);
  await expect(page.getByTestId('health-consent-manage-sources')).toBeVisible();
  await testInfo.attach('privacy-mobile-rtl', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  expect(writes, 'a write reached the consent API').toEqual([]);
});
