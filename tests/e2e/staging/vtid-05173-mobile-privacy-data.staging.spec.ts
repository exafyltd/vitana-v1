// VTID-05173 — Health Hub D4 on the phone: Settings › Privacy › Data (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. At 390x844 the signed-in test user opens
// /settings?mode=privacy.data (MobileSettings) and the page must show the three
// data-sharing switches off and disabled and "Request data export" disabled.
// The desktop deep link /settings/privacy?section=data must land on the same
// mobile mode. Navigation and reads only — nothing is clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05096 spec),
    // plus every ORB call — those POSTs are aborted like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_live_stream_subscriber_counts|get_live_stream_subscribers)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

const SHARING_SWITCHES = [
  /Gesundheitsdaten-Analyse|Health Data Analytics/,
  /Community-Einblicke|Community Insights/,
  /Drittanbieter-Integrationen|Third-party Integrations/,
];
const EXPORT_BUTTON = /Datenexport anfordern|Request Data Export/;

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
}

async function expectSharingOff(page: import('@playwright/test').Page) {
  for (const name of SHARING_SWITCHES) {
    const sw = page.getByRole('switch', { name });
    await expect(sw).toBeVisible({ timeout: 30_000 });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(sw).toBeDisabled();
  }
  await expect(page.getByRole('button', { name: EXPORT_BUTTON })).toBeDisabled();
}

test('VTID-05173: mobile privacy data-sharing switches are off and disabled, export disabled (phone)', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  // 1. The mobile mode directly.
  await page.goto('/settings?mode=privacy.data', { waitUntil: 'domcontentloaded' });
  await expectSharingOff(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await testInfo.attach('mobile-privacy-data', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  // 2. The desktop deep link redirects to the same mobile mode.
  await page.goto('/settings/privacy?section=data', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/settings\?mode=privacy\.data/, { timeout: 30_000 });
  await expectSharingOff(page);
  await testInfo.attach('mobile-privacy-data-redirect', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
});
