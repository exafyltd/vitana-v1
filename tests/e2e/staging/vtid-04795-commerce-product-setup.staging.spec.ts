// VTID-04795 — a business's admin adds products through four clear options,
// picks Product / Service / Experience, and sets sales up once, for the business.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and nothing here is saved. The test user has no business, so this spec
// answers the business list and the business's own reads with a demo business
// inside the browser (page.route) — no request with that data reaches the
// gateway. Only local clicks: the chooser, the kind picker, the sales sheet.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: null, status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };

test('setup hub → four options, AI in development; Product/Service/Experience; sales set up once', async ({ page, request }) => {
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

  // Four ways in; AI-assisted setup is marked in development, not recommended.
  await page.getByTestId('setup-step-products').getByRole('button').click();
  for (const id of ['ai', 'shop', 'manual', 'api']) await expect(page.getByTestId(`setup-option-${id}`)).toBeVisible();
  await expect(page.getByTestId('setup-option-ai').locator('.border-amber-300')).toHaveCount(1);

  // Add myself → Product / Service / Experience; a service gets service wording.
  await page.getByTestId('setup-option-manual').click();
  for (const k of ['product', 'service', 'experience']) await expect(page.getByTestId(`add-kind-${k}`)).toBeVisible();
  await page.getByTestId('add-kind-service').click();
  await expect(page.locator('#pf-title')).toBeVisible();
  await expect(page.locator('#pf-business')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Sales setup: regions first, one typical time, per-region only on request.
  await page.getByTestId('setup-step-sales').getByRole('button').click();
  await expect(page.locator('#ss-typical')).toHaveCount(0);
  await page.getByTestId('sales-region-world').click();
  await expect(page.locator('#ss-typical')).toBeVisible();
  await expect(page.locator('#ss-days-eu')).toHaveCount(0);
  await page.getByRole('switch').click();
  await expect(page.locator('#ss-days-eu')).toBeVisible();
  await expect(page.locator('#ss-network')).toHaveCount(0);
});
