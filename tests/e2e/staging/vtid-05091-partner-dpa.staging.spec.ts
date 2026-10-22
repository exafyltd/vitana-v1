// VTID-05091 — the data processing agreement (AVV) on staging, read-only.
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   1. GET /api/v1/partner-onboarding/:orgId/dpa is mounted and guarded:
//      anonymous → 401 JSON; signed in as the test user (who administers no
//      partner business) on a business that is not theirs → 403/404 JSON,
//      never a 5xx and never HTML.
//   2. Commerce › "Get ready to sell": for a business whose checklist requires
//      a DPA, the row reads "being prepared" with nothing to click while no
//      version is published; with a version, the row opens the sheet with the
//      declaration unticked and Sign disabled until name, role and tick are
//      there. The business, its checklist and the DPA are answered inside the
//      browser (page.route) with a placeholder text that is not a contract —
//      no DPA is published on staging. Sign is never clicked and the sign
//      endpoint is aborted.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04909 spec)
    // and every ORB call: they are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const NIL_ORG = '00000000-0000-0000-0000-000000000000';
const DEMO = { id: 'demo-lab', org_key: 'demo-lab', display_name: 'Demo Labor', org_type: 'lab', partner_type: 'lab', status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };

// A placeholder, clearly not an agreement: the real text comes from legal through the admin API.
const PLACEHOLDER = {
  title: 'Platzhalter – kein Vertrag (Staging-Test)',
  body_md: '## 1. Platzhalter\n\nDieser Text ist ein Test-Platzhalter und kein Vertrag.',
  signing_declaration: null,
};

function dpaAnswer(published: boolean) {
  return published
    ? {
        ok: true,
        required: true,
        published: true,
        signed: false,
        signed_at: null,
        signed_version: null,
        resign_required: false,
        dpa: {
          id: 'staging-placeholder',
          version: 'staging-test',
          published_at: '2026-10-12T00:00:00Z',
          content_sha256: 'placeholder-hash',
          binding_locale: 'de',
          binding: PLACEHOLDER,
          locale: 'de',
          fallback: false,
          direction: 'ltr',
          text: PLACEHOLDER,
          signing_declaration: null,
          available_locales: ['de'],
          shown_locale: 'de',
        },
      }
    : { ok: true, required: true, published: false, dpa: null, signed: false, signed_at: null, signed_version: null, resign_required: false };
}

async function signIn(page: Page, request: APIRequestContext) {
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
  return session as { access_token: string };
}

async function openHub(page: Page, request: APIRequestContext, published: boolean) {
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
  await page.route('**/api/v1/partner-onboarding/demo-lab/catalogue', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: null, products: [] } }) : r.abort());
  await page.route('**/api/v1/partner-onboarding/demo-lab', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({
          json: {
            ok: true,
            organization: { ...DEMO, country: 'DE', website: null, legal_name: 'Demo Labor GmbH' },
            checklist: {
              steps: [
                published
                  ? { key: 'dpa', required: true, status: 'todo', detail: { current_version: 'staging-test' } }
                  : { key: 'dpa', required: true, status: 'todo', missing: ['dpa_not_published'] },
              ],
            },
          },
        })
      : r.abort());
  await page.route(/\/api\/v1\/partner-onboarding\/demo-lab\/terms(\?|$)/, (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, published: false, terms: null } }) : r.abort());
  await page.route(/\/api\/v1\/partner-onboarding\/demo-lab\/dpa(\?|$)/, (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: dpaAnswer(published) }) : r.abort());
  // Signing is never part of this spec; make sure it could not reach anything.
  await page.route(/\/api\/v1\/partner-onboarding\/demo-lab\/dpa\/sign/, (r) => r.abort());

  const session = await signIn(page, request);
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('setup-hub')).toBeVisible({ timeout: 30_000 });
}

const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });

test('GET /partner-onboarding/:orgId/dpa is mounted and guarded (anonymous 401, foreign business 403/404, JSON, no 5xx)', async ({ page, request }) => {
  const anon = await request.get(`${GATEWAY}/api/v1/partner-onboarding/${NIL_ORG}/dpa?locale=de`);
  expect(anon.status()).toBe(401);
  expect(anon.headers()['content-type'] ?? '').toContain('application/json');

  const session = await signIn(page, request);
  const res = await request.get(`${GATEWAY}/api/v1/partner-onboarding/${NIL_ORG}/dpa?locale=de`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status(), 'the test user administers no partner business').toBeLessThan(500);
  expect([403, 404]).toContain(res.status());
  expect(res.headers()['content-type'] ?? '').toContain('application/json');
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(typeof body.error).toBe('string');
});

for (const [label, viewport] of [
  ['mobile', { width: 390, height: 844 }],
  ['desktop', { width: 1400, height: 900 }],
] as const) {
  test(`DPA row: being prepared while nothing is published (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await openHub(page, request, false);
    const row = page.getByTestId('setup-dpa');
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute('data-state', 'todo');
    await expect(row).toHaveAttribute('data-dpa', 'pending_legal');
    await expect(row.locator('button')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await row.scrollIntoViewIfNeeded();
    await shot(page, `01-dpa-pending-${label}`);
  });

  test(`DPA sheet: unticked, Sign disabled until name, role and tick (never clicked) (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await openHub(page, request, true);
    const row = page.getByTestId('setup-dpa');
    await expect(row).toHaveAttribute('data-state', 'todo');
    await row.click();
    await expect(page.getByTestId('partner-dpa-sheet')).toBeVisible();
    await expect(page.getByTestId('partner-dpa-text')).toContainText('Platzhalter');
    await expect(page.getByTestId('partner-dpa-binding-notice')).toBeVisible();
    await expect(page.getByTestId('partner-dpa-declaration')).toHaveAttribute('data-state', 'unchecked');
    await expect(page.getByTestId('partner-dpa-sign')).toBeDisabled();
    await page.getByTestId('partner-dpa-name').fill('Test Person');
    await page.getByTestId('partner-dpa-role').fill('Test');
    await expect(page.getByTestId('partner-dpa-sign')).toBeDisabled();
    await page.getByTestId('partner-dpa-declaration').click();
    await expect(page.getByTestId('partner-dpa-sign')).toBeEnabled();
    await shot(page, `02-dpa-sheet-ready-${label}`);
    // Sign is never clicked: nothing is signed on staging.
  });
}
