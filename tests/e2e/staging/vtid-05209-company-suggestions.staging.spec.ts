// VTID-05209 — the Business profile sheet on staging shows country and website
// Vitanaland already knows as a short summary with one Save, and the staging
// gateway's suggestion route answers the documented shape for the signed-in
// test user. Read-only: './staging-guard' aborts every write, the demo
// business is answered inside the browser (page.route), Save is never pressed
// and any PATCH is recorded and aborted.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04925 spec)
    // and every ORB call: they are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: 'service_provider', status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };
const CHECKLIST = { steps: [], submit_ready: false, submit_missing: ['company'], complete: false };

async function signIn(page: Page, request: APIRequestContext): Promise<string> {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(anon)).text();
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

  return session.access_token as string;
}

test('the staging gateway answers the suggestion route with plain facts only (GET, signed in)', async ({ page, request }) => {
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const token = await signIn(page, request);
  const res = await request.get(`${GATEWAY}/api/v1/partner-onboarding/company-suggestions`, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Object.keys(body).sort()).toEqual(['country', 'ok', 'website']);
  expect(body.ok).toBe(true);
  for (const k of ['country', 'website'] as const) {
    if (body[k] !== null) expect(Object.keys(body[k]).sort()).toEqual(['source', 'value']);
  }
});

for (const [label, viewport] of [
  ['phone 390x844', { width: 390, height: 844 }],
  ['desktop 1280x900', { width: 1280, height: 900 }],
] as const) {
  test(`business profile — suggested values as a summary, nothing saved (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    const writes: string[] = [];
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
    await page.route('**/api/v1/partner-onboarding/demo-org/catalogue', (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: null, products: [] } }) : r.abort());
    await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/terms(\?|$)/, (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, published: false } }) : r.abort());
    await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/company-suggestions/, (r) =>
      r.fulfill({ json: { ok: true, country: { value: 'DE', source: 'email_domain' }, website: { value: 'https://demo-studio.de', source: 'email_domain' } } }));
    // Saving is never part of this spec: record any attempt and stop it.
    await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/company$/, (r) => {
      writes.push(r.request().method());
      return r.abort();
    });
    await page.route('**/api/v1/partner-onboarding/demo-org', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: { ok: true, organization: { ...DEMO, country: null, website: null }, checklist: CHECKLIST } })
        : r.abort());

    await signIn(page, request);
    await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('setup-hub')).toBeVisible({ timeout: 30_000 });
    const row = page.getByTestId('setup-step-profile');
    await expect(row).toHaveAttribute('data-state', 'todo');
    await row.getByRole('button').click();

    await expect(page.getByTestId('profile-summary')).toBeVisible();
    await expect(page.getByTestId('profile-summary-website')).toHaveText('https://demo-studio.de');
    await expect(page.getByTestId('profile-save')).toBeEnabled();
    await page.screenshot({ path: test.info().outputPath(`${viewport.width}x${viewport.height}-summary.png`), fullPage: false });
    // "Change" reveals the inputs, prefilled with the same values.
    await page.getByTestId('profile-change').click();
    await expect(page.getByTestId('profile-website')).toHaveValue('https://demo-studio.de');
    await expect(page.getByTestId('profile-country')).toHaveValue('DE');
    expect(writes, 'nothing was saved').toEqual([]);
  });
}
