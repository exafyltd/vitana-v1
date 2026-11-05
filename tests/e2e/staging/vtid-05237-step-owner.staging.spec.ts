// VTID-05237 — "Still needed" on the Commerce setup hub says who can finish each open step:
// "Only you can do this" / "Your AI assistant can do this" / "Vitanaland is checking".
// Read-only: './staging-guard' aborts every write, the demo business and its checklist (with the
// gateway's `owner` field) are answered inside the browser (page.route), and the MCP sign-in
// metadata is answered as reachable. Nothing is saved, submitted or sent.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-05209 spec); aborted like every write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: 'service_provider', status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };

const step = (key: string, status: string, owner: string | undefined) => ({ key, required: true, status, ...(owner ? { owner } : {}), missing: [], detail: {} });
const CHECKLIST = {
  steps: [
    step('account', 'done', undefined),
    step('company', 'todo', 'assistant'),
    step('verification', 'in_progress', 'vitanaland'),
    step('catalogue', 'todo', 'assistant'),
    step('terms', 'todo', 'supplier'),
  ],
  submit_ready: false,
  submit_missing: ['company'],
  complete: false,
};

async function signIn(page: Page, request: APIRequestContext): Promise<void> {
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
}

async function serveDemo(page: Page, mcpReachable: boolean): Promise<string[]> {
  const writes: string[] = [];
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
  await page.route('**/api/v1/partner-onboarding/demo-org/catalogue', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: null, products: [] } }) : r.abort());
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/terms(\?|$)/, (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, published: false } }) : r.abort());
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/company-suggestions/, (r) => r.fulfill({ json: { ok: true, country: null, website: null } }));
  await page.route('**/.well-known/oauth-protected-resource/mcp', (r) =>
    mcpReachable
      ? r.fulfill({ json: { resource: 'https://preview-aws-gateway.vitanaland.com/mcp', authorization_servers: ['https://inmkhvwdcuyhnxkgfvsb.supabase.co/auth/v1'] } })
      : r.fulfill({ status: 503, body: '' }));
  await page.route('**/api/v1/partner-onboarding/demo-org', (r) => {
    if (r.request().method() !== 'GET') {
      writes.push(r.request().method());
      return r.abort();
    }
    return r.fulfill({ json: { ok: true, organization: { ...DEMO, country: null, website: null }, checklist: CHECKLIST } });
  });
  return writes;
}

for (const [label, viewport] of [
  ['phone 390x844', { width: 390, height: 844 }],
  ['desktop 1280x900', { width: 1280, height: 900 }],
] as const) {
  test(`still needed — grouped by who can finish each step, assistant group shown (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    const writes = await serveDemo(page, true);
    await signIn(page, request);
    await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
    const box = page.getByTestId('setup-still-needed');
    await expect(box).toBeVisible({ timeout: 30_000 });
    await expect(box.locator('[data-owner]')).toHaveCount(3);
    const owners = await box.locator('[data-owner]').evaluateAll((els) => els.map((e) => e.getAttribute('data-owner')));
    expect(owners).toEqual(['supplier', 'assistant', 'vitanaland']);
    await expect(box.locator('[data-owner="assistant"] [data-step]')).toHaveCount(2);
    await expect(box.locator('[data-owner="supplier"] [data-step="terms"]')).toHaveCount(1);
    await expect(box.locator('[data-owner="vitanaland"] [data-step="verification"]')).toHaveCount(1);
    await box.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`${viewport.width}x${viewport.height}-grouped.png`), fullPage: false });
    expect(writes, 'nothing was written').toEqual([]);
  });
}

test('still needed — assistant steps fall back to the supplier group while the assistant is not reachable (phone 390x844)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const writes = await serveDemo(page, false);
  await signIn(page, request);
  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
  const box = page.getByTestId('setup-still-needed');
  await expect(box).toBeVisible({ timeout: 30_000 });
  await expect(box.locator('[data-owner="assistant"]')).toHaveCount(0);
  await expect(box.locator('[data-owner="supplier"] [data-step]')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('390x844-assistant-unreachable.png'), fullPage: false });
  expect(writes, 'nothing was written').toEqual([]);
});
