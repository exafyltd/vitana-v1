// VTID-05136 — "Get ready to sell" on staging: the verification row follows the
// checklist, "Still needed" lists the open steps, and Submit opens a confirm
// dialog without sending anything. Read-only like the VTID-04925 spec:
// './staging-guard' aborts every write, the demo business and its checklist are
// answered inside the browser (page.route), and the dialog is never confirmed.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04925 spec)
    // and every ORB call: they are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: 'service_provider', status: 'pending_review', lifecycle_state: 'needs_action', role: 'org_admin' };
const step = (key: string, status: string, extra: Record<string, unknown> = {}) => ({ key, required: true, status, missing: [], detail: {}, ...extra });
// An admin-approved business that still needs one complete offering (the EXAFY shape).
const CHECKLIST = {
  steps: [
    step('account', 'done'),
    step('company', 'done'),
    step('verification', 'done'),
    step('catalogue', 'done'),
    step('mapping', 'todo', { missing: ['complete_offering'], detail: { source: 'catalogue', complete_offerings: 0 } }),
    step('tracking_test', 'not_required', { required: false }),
    step('terms', 'done'),
    step('billing_mandate', 'not_required', { required: false }),
  ],
  submit_ready: true,
  submit_missing: [],
  complete: false,
};

async function signInAndOpenHub(page: Page, request: APIRequestContext, submits: string[]) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
  await page.route('**/api/v1/partner-onboarding/demo-org/catalogue', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: { id: 'demo-merchant' }, products: [{ id: 'demo-product' }] } }) : r.abort());
  await page.route('**/api/v1/partner-onboarding/demo-org', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ json: { ok: true, organization: { ...DEMO, country: 'DE', website: null }, checklist: CHECKLIST } })
      : r.abort());
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/terms(\?|$)/, (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, published: false } }) : r.abort());
  // Submitting is never part of this spec: record any attempt and stop it.
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/submit/, (r) => {
    submits.push(r.request().method());
    return r.abort();
  });

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

  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('setup-hub')).toBeVisible({ timeout: 30_000 });
}

for (const [label, viewport] of [
  ['phone 390x844', { width: 390, height: 844 }],
  ['desktop 1280x900', { width: 1280, height: 900 }],
] as const) {
  test(`setup hub — verification done, still needed listed, Resubmit only asks (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    const submits: string[] = [];
    await signInAndOpenHub(page, request, submits);

    await expect(page.getByTestId('setup-step-verification')).toHaveAttribute('data-state', 'done');
    const needed = page.getByTestId('setup-still-needed');
    await expect(needed).toBeVisible();
    await expect(needed.locator('li')).toHaveCount(1);
    await expect(needed.locator('li').first()).toHaveAttribute('data-step', 'mapping');

    const submit = page.getByTestId('setup-submit');
    await expect(submit).toHaveAttribute('data-mode', 'resubmit');
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
    await expect(page.getByTestId('setup-submit-confirm')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`${viewport.width}x${viewport.height}-confirm.png`), fullPage: false });
    // Cancel, never confirm.
    await page.getByTestId('setup-submit-cancel').click();
    await expect(page.getByTestId('setup-submit-confirm')).toHaveCount(0);
    expect(submits, 'no submit request was sent').toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`${viewport.width}x${viewport.height}.png`), fullPage: true });
  });
}
