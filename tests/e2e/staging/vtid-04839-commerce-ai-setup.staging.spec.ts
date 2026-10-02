// VTID-04839 — "Set up with AI" leads the Commerce Portal once the gateway has
// it switched on: website in, a draft to review, one tap to create.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// The gateway's status and draft answers are given inside the browser
// (page.route), so no website is read and no model is called; the test fills
// in the one missing price and checks that "Create my business" becomes
// available — it never taps it. Creating is proven by the gateway's Jest
// suites and by the owner's own run on staging (owner decision 2026-10-02).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: [
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
    // VTID-04855: read-only lookups the signed-in app sends as POST (Supabase RPCs,
    // the membership function, the ORB prewarm). The guard still aborts them —
    // nothing reaches production — this only stops counting them as writes.
    /(supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
  ],
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DRAFT = {
  website: 'https://kraeuter.example/',
  business: { display_name: 'Kräuterhaus', category: 'supplements_nutrition', country: 'DE', description: null, currency: 'EUR' },
  products: [
    { title: 'Kamillentee', description: null, price_cents: 490, currency: null, url: null, image: null, kind: 'product' },
    { title: 'Beratung', description: null, price_cents: null, currency: null, url: null, image: null, kind: 'service' },
  ],
  source: 'website',
  notes: [],
};

test('AI setup leads; website → review card; a missing price must be filled before creating', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  // A first-time supplier (no business), with AI setup switched on.
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [] } }));
  // VTID-04855: staging serves the Commerce MCP endpoint (VTID-04847), so the
  // portal would lead with "Connect your AI agent". This suite covers the AI
  // setup path the portal shows when MCP is off — simulate that.
  await page.route('**/.well-known/oauth-protected-resource/mcp', (r) => r.fulfill({ status: 404, json: { ok: false, error: 'COMMERCE_MCP_DISABLED' } }));
  await page.route('**/api/v1/commerce/ai-setup/status', (r) => r.fulfill({ json: { ok: true, enabled: true } }));
  await page.route('**/api/v1/commerce/ai-setup/draft', (r) => r.fulfill({ json: { ok: true, draft: DRAFT } }));

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
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
    sessionStorage.removeItem('vitana.commerce.autoRegisterShown');
  }, session);

  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });

  // A first-time supplier lands straight in the AI setup (not the manual form).
  const sheet = page.getByTestId('ai-setup');
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ai-prefer-manual')).toBeVisible();

  await page.getByTestId('ai-website').fill('kraeuter.example');
  await page.getByTestId('ai-read').click();

  // The review card: editable name and country, the offers found.
  await expect(page.getByTestId('ai-name')).toHaveValue('Kräuterhaus', { timeout: 20_000 });
  await expect(page.getByTestId('ai-country')).toHaveValue('DE');
  await expect(page.getByTestId('ai-products').locator('li')).toHaveCount(2);

  // "Beratung" has no price: creating waits for it.
  const create = page.getByTestId('ai-create');
  await expect(create).toBeDisabled();
  await page.getByTestId('ai-products').locator('li').nth(1).locator('input[inputmode="decimal"]').fill('30');
  await expect(create).toBeEnabled();
  // Never tapped: creating writes, and staging shares the production database.

  // Behind the sheet, the hero leads with AI.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hero-ai')).toBeVisible();
});
