// VTID-05206 — Settings → Privacy shows "Introduce me to the community" (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Phone viewport (390x844): on a phone,
// Settings → Privacy is MobileSettings (?mode=privacy.visibility). The member's
// global_community_profiles.community_intro_opt_in read is answered inside the
// browser (page.route), so the screen is proven independent of migration/deploy
// order, for both states. The switch is never flipped: the write is proven in CI
// (src/components/settings/CommunityIntroToggle.vtid-05206.test.tsx) and the
// column's defaults on PGlite (docs/validation/VTID-05206/outputs/).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05133 spec) plus every ORB call.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/|gateway\.vitanaland\.com\/api\/v1\/diag\/notif-tap)/,
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
}

/** Answer only the switch's own read; every other global_community_profiles read goes through. */
async function answerOptIn(page: import('@playwright/test').Page, value: boolean) {
  await page.route('**/rest/v1/global_community_profiles**', (r) =>
    r.request().method() === 'GET' && /select=community_intro_opt_in(&|$)/.test(r.request().url())
      ? r.fulfill({ json: { community_intro_opt_in: value } })
      : r.continue(),
  );
}

for (const value of [false, true]) {
  test(`VTID-05206: Settings → Privacy shows "Introduce me to the community" ${value ? 'on' : 'off'} (phone)`, async ({ page, request }) => {
    // Diagnostics only: when the row is missing, the failure says what the page was doing (url, failed
    // requests, the opt-in read, the visible text) instead of just "element(s) not found". No assertion is relaxed.
    const seen: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') seen.push(`console: ${m.text().slice(0, 140)}`); });
    page.on('pageerror', (e) => seen.push(`pageerror: ${String(e.message).slice(0, 140)}`));
    page.on('requestfailed', (r) => { if (/supabase\.co|vitanaland\.com/.test(r.url())) seen.push(`reqfailed: ${r.method()} ${r.url().slice(0, 90)} ${r.failure()?.errorText ?? ''}`); });
    page.on('response', (r) => { if (/global_community_profiles/.test(r.url())) seen.push(`resp ${r.status()}: ${r.url().slice(0, 130)}`); });

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await answerOptIn(page, value);

    await page.goto('/settings?mode=privacy.visibility', { waitUntil: 'domcontentloaded' });
    const row = page.getByTestId('community-intro');
    try {
      await expect(row).toBeVisible({ timeout: 30_000 });
    } catch (err) {
      const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 280);
      throw new Error(
        `community-intro row not visible (value=${value}). url=${page.url()} | events(${seen.length})=${seen.slice(0, 8).join(' ; ') || 'none'} | body="${body}" | ${(err as Error).message.split('\n')[0]}`,
      );
    }
    await expect(page.getByTestId('community-intro-switch')).toHaveAttribute('aria-checked', String(value));
    await expect(page.getByTestId('community-intro-switch')).toBeEnabled();
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/vtid-05206-community-intro-${value ? 'on' : 'off'}-phone.png`, fullPage: false });
  });
}
