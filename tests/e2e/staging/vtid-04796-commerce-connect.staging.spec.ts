// VTID-04796 — "Connect your system": a supplier sees one address field and
// "Check connection"; connector/provider IDs and OpenAPI wait under Developer
// settings; an address we cannot recognise offers documentation or help.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write —
// including the platform check, which is a POST — so the check lands in the
// not-recognised branch by construction, and nothing is ever created. The
// test user has no business, so the business list and its reads are answered
// with a demo business inside the browser (page.route).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|vcaop\/portal\/my\/connections\/detect-platform)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: null, status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };

test('connect your system: one URL first, developer settings on request, not-recognised offers docs or help', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
  await page.route('**/api/v1/partner-onboarding/demo-org/catalogue', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: null, products: [] } }) : r.abort());
  await page.route('**/api/v1/partner-onboarding/demo-org', (r) =>
    r.fulfill({ json: { ok: true, organization: { ...DEMO, country: 'DE', website: null }, checklist: null } }));

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
  const bundle = await (await request.get(anon)).text();
  // The anon key is the JWT in the bundle whose payload names this project and role anon.
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
  await page.getByTestId('setup-step-products').getByRole('button').click();
  await page.getByTestId('setup-option-shop').click();

  // One question first; no technical identifiers on show.
  await expect(page.locator('#mc-url')).toBeVisible();
  await expect(page.locator('#mc-connector')).toHaveCount(0);
  await page.locator('#mc-url').fill('example.org');
  await page.getByTestId('connect-check').click();

  // The check is aborted by the read-only guard → the not-recognised branch.
  await expect(page.getByTestId('connect-not-detected')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('connect-not-detected').locator('a[href="/support"]')).toHaveCount(1);
  await page.getByTestId('connect-not-detected').getByRole('button').click();
  await expect(page.locator('#mc-connector')).toBeVisible();
});
