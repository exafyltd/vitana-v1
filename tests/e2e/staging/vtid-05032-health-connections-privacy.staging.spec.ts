// VTID-05032 — Health Hub D3 + D4 on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - GET /api/v1/wearables/providers answers with at least one provider, so an
//     empty "connected" state on the page is real, not a silent failure;
//   - Settings › Connected Apps shows a health card as connected only when the
//     gateway lists that provider as connected, and none of the old invented
//     sync times or history entries appear (Connected tab and Data Sync tab);
//   - Settings › Privacy › Data Sharing shows the three data-sharing switches
//     off and disabled, and "Request data export" disabled.
// GETs and navigation only — nothing is clicked that writes.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05024 spec).
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

// Health card id → gateway connector id (none = no connector, never connected).
const HEALTH_CARDS: Record<string, string | null> = {
  'health-apple-health': null,
  'health-fitbit': 'fitbit',
  'health-strava': 'strava',
  'health-oura': 'oura',
  'health-garmin': null,
  'health-myfitnesspal': null,
  'sleep-oura': 'oura',
  'sleep-eightsleep': null,
  'sleep-withings-sleep': null,
  'nutrition-myfitnesspal': null,
  'nutrition-cronometer': null,
  'nutrition-lifesum': null,
  'nutrition-yazio': null,
};

// The fabricated values the old page rendered.
const FAKE_TEXT = [
  /\b\d+ minutes ago\b/,
  /\b10:42\b/,
  /synced steps \+ heart rate/,
  /All Systems Operational/,
];

const CONNECTED_LABEL = /^(Verbunden|Connected)$/;

test('health connections come from the gateway; privacy data sharing is off', async ({ page, request }, testInfo) => {
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

  // 1. The gateway's real state (GET only).
  const res = await request.get(`${GATEWAY}/api/v1/wearables/providers`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.providers) && body.providers.length, 'the gateway lists no wearable provider').toBeGreaterThanOrEqual(1);
  const connectedIds = new Set<string>(
    body.providers.filter((p: { status: string }) => p.status === 'connected').map((p: { id: string }) => p.id),
  );

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // 2. Connected Apps (desktop): a health card is connected only if the gateway says so.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/settings/connected-apps', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#card-title-health-fitbit')).toBeVisible({ timeout: 30_000 });
  // Let the providers query settle before reading badges.
  await page.waitForResponse((r) => r.url().includes('/api/v1/wearables/providers'), { timeout: 15_000 }).catch(() => null);
  await page.waitForTimeout(1_000);

  for (const [cardId, connectorId] of Object.entries(HEALTH_CARDS)) {
    const badges = await page
      .locator(`#card-title-${cardId}`)
      .locator('xpath=..')
      .locator('span')
      .allTextContents();
    const showsConnected = badges.some((b) => CONNECTED_LABEL.test(b.trim()));
    const shouldBeConnected = connectorId !== null && connectedIds.has(connectorId);
    expect(showsConnected, `${cardId} connected badge vs gateway (${connectorId ?? 'no connector'})`).toBe(shouldBeConnected);
  }
  const connectedText = await page.locator('body').innerText();
  for (const fake of FAKE_TEXT) expect(connectedText, `fake text ${fake} on the Connected tab`).not.toMatch(fake);
  await testInfo.attach('connected-apps-desktop', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  // Data Sync tab: only real connections, no invented history.
  await page.locator('[id$="-trigger-sync"]').first().click();
  await page.waitForTimeout(500);
  const syncText = await page.locator('body').innerText();
  for (const fake of FAKE_TEXT) expect(syncText, `fake text ${fake} on the Data Sync tab`).not.toMatch(fake);
  const syncCards = await page.locator('[id^="card-title-app-sync-"]').evaluateAll((els) => els.map((e) => e.id.replace('card-title-app-sync-', '')));
  expect(syncCards.sort()).toEqual([...connectedIds].sort());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/connected-apps', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  const mobileText = await page.locator('body').innerText();
  for (const fake of FAKE_TEXT) expect(mobileText, `fake text ${fake} on mobile Connected Apps`).not.toMatch(fake);
  await testInfo.attach('connected-apps-mobile', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  // 3. Privacy › Data Sharing: switches off + disabled, export disabled.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/settings/privacy?section=data', { waitUntil: 'domcontentloaded' });
  for (const name of [
    /Gesundheitsdaten-Analyse|Health Data Analytics/,
    /Community-Einblicke|Community Insights/,
    /Drittanbieter-Integrationen|Third-party Integrations/,
  ]) {
    const sw = page.getByRole('switch', { name });
    await expect(sw).toBeVisible({ timeout: 30_000 });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(sw).toBeDisabled();
  }
  await expect(page.getByRole('button', { name: /Datenexport anfordern|Request Data Export/ })).toBeDisabled();
  await testInfo.attach('privacy-desktop', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/privacy?section=data', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  await testInfo.attach('privacy-mobile', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
});
