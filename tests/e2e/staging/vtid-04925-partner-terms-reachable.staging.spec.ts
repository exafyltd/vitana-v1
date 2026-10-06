// VTID-04925 — the partner terms sheet keeps the tick and Accept on screen at
// short heights: narrow phone, short phone (DevTools docked) and a short wide
// window. Read-only like the VTID-04909 spec: './staging-guard' aborts every
// write, the business and the terms are answered inside the browser
// (page.route), and Accept is never clicked.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    // The signed-in app's own read-only POSTs (same list as the VTID-04864 spec)
    // and every ORB call: they are aborted here like every other write.
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DEMO = { id: 'demo-org', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', partner_type: null, status: 'pending_review', lifecycle_state: 'draft', role: 'org_admin' };
const DRAFT = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/e2e/staging/fixtures/partner-terms-2026-10-draft.json'), 'utf8')) as {
  version: string;
  content: Record<string, { title: string; body_md: string }>;
};
const LOCALES = ['de', 'en', 'es', 'sr', 'fr', 'pt-BR', 'ru', 'pl', 'ar', 'zh-CN', 'tr'];
const FROM_APP: Record<string, string> = { 'de-DE': 'de', 'en-US': 'en', 'es-ES': 'es', 'sr-RS': 'sr', 'fr-FR': 'fr', 'pt-BR': 'pt-BR', 'ru-RU': 'ru', 'pl-PL': 'pl', 'ar-XA': 'ar', 'zh-CN': 'zh-CN', 'tr-TR': 'tr' };

/** What the gateway would answer for ?locale= (VTID-04909 shape; German hash whatever the language). */
function termsAnswer(requested: string) {
  const locale = LOCALES.includes(requested) ? requested : FROM_APP[requested] ?? 'de';
  return {
    ok: true,
    published: true,
    accepted: false,
    reacceptance_required: false,
    terms: {
      id: 'draft-preview',
      version: DRAFT.version,
      published_at: '2026-10-06T00:00:00Z',
      content_sha256: 'draft-preview-german-hash',
      binding_locale: 'de',
      binding: DRAFT.content.de,
      locale,
      fallback: false,
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      text: DRAFT.content[locale],
      available_locales: LOCALES,
      translation: locale === 'de' ? null : { locale, ...DRAFT.content[locale] },
      shown_locale: locale,
    },
  };
}

async function signInAndOpenTerms(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  // The Vitana ORB is not part of this screen; after sign-in it can open over
  // the page by itself (front door), so its script is not loaded in this test.
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/api/v1/partner-orgs/mine', (r) => r.fulfill({ json: { ok: true, organizations: [DEMO] } }));
  await page.route('**/api/v1/partner-onboarding/demo-org/catalogue', (r) =>
    r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, merchant: null, products: [] } }) : r.abort());
  await page.route('**/api/v1/partner-onboarding/demo-org', (r) =>
    r.fulfill({ json: { ok: true, organization: { ...DEMO, country: 'DE', website: null }, checklist: null } }));
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/terms(\?|$)/, (r) => {
    if (r.request().method() !== 'GET') return r.abort();
    const locale = new URL(r.request().url()).searchParams.get('locale') ?? '';
    return r.fulfill({ json: termsAnswer(locale) });
  });
  // Accepting is never part of this spec; make sure it could not reach anything.
  await page.route(/\/api\/v1\/partner-onboarding\/demo-org\/terms\/accept/, (r) => r.abort());

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
  await page.getByTestId('setup-terms').click();
  await expect(page.getByTestId('partner-terms-sheet')).toBeVisible();
  await expect(page.getByTestId('partner-terms-text')).toBeVisible();
}

for (const [label, viewport] of [
  ['narrow phone 390x600', { width: 390, height: 600 }],
  ['short phone 412x480', { width: 412, height: 480 }],
  ['short wide window 1280x600', { width: 1280, height: 600 }],
] as const) {
  test(`partner terms — tick and Accept visible without scrolling, terms still scroll (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await signInAndOpenTerms(page, request);
    for (const id of ['partner-terms-agree', 'partner-terms-accept']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} is rendered`).toBeTruthy();
      expect(box!.y, `${id} top inside the window`).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, `${id} bottom inside the window`).toBeLessThanOrEqual(viewport.height);
    }
    await expect(page.getByTestId('partner-terms-accept')).toBeDisabled();
    const body = page.locator('[data-terms-body]');
    const before = await body.evaluate((el) => el.scrollTop);
    const bodyBox = await body.boundingBox();
    await page.mouse.move(bodyBox!.x + bodyBox!.width / 2, bodyBox!.y + Math.min(bodyBox!.height / 2, 80));
    await page.mouse.wheel(0, 800);
    await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    // Still on screen after scrolling the terms.
    const accept = await page.getByTestId('partner-terms-accept').boundingBox();
    expect(accept!.y + accept!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: test.info().outputPath(`${viewport.width}x${viewport.height}.png`), fullPage: false });
  });
}
