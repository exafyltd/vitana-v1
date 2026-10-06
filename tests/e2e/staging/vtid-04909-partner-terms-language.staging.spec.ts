// VTID-04909 — the partner terms sheet: German binding notice always on screen,
// one language at a time with a language switcher, Arabic right to left, the
// checkbox never pre-ticked and Accept off until it is ticked.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and nothing is accepted — Accept is never clicked. No partner terms version
// exists in the database (none is published), and the test user has no
// business, so this spec answers the business list, the business's reads and
// the terms read with a demo business and the v1 DRAFT text inside the
// browser (page.route). No request with that data reaches the gateway.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
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

async function pick(page: Page, locale: string) {
  await page.getByTestId('partner-terms-language').click();
  await page.getByTestId(`partner-terms-language-${locale}`).click();
  await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('lang', locale);
}

const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });

for (const [label, viewport] of [
  ['mobile', { width: 390, height: 844 }],
  ['tablet', { width: 820, height: 1180 }],
  ['desktop', { width: 1400, height: 900 }],
] as const) {
  test(`partner terms — German default, binding notice, unticked (${label})`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await signInAndOpenTerms(page, request);
    // German is the default whenever the app language is German or missing; switch to it explicitly otherwise.
    if ((await page.getByTestId('partner-terms-text').getAttribute('lang')) !== 'de') await page.getByTestId('partner-terms-read-german').click();
    await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('lang', 'de');
    await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('partner-terms-text')).toContainText('Partnerbedingungen VITANALAND Commerce');
    await expect(page.getByTestId('partner-terms-binding-notice')).toBeVisible();
    await expect(page.getByTestId('partner-terms-version')).toContainText('2026-10');
    await expect(page.getByTestId('partner-terms-agree')).toHaveAttribute('data-state', 'unchecked');
    await expect(page.getByTestId('partner-terms-accept')).toBeDisabled();
    // No horizontal overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await shot(page, `01-de-${label}`);
  });
}

test('partner terms — switcher, English, Arabic RTL, Serbian, Spanish; tick enables Accept (never clicked)', async ({ page, request }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await signInAndOpenTerms(page, request);

  await page.getByTestId('partner-terms-language').click();
  for (const l of LOCALES) await expect(page.getByTestId(`partner-terms-language-${l}`)).toBeVisible();
  await shot(page, '02-language-switcher');
  await page.getByTestId('partner-terms-language-en').click();
  await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('partner-terms-text')).toContainText('Partner Terms VITANALAND Commerce');
  await expect(page.getByTestId('partner-terms-binding-notice')).toBeVisible();
  await expect(page.getByTestId('partner-terms-read-german')).toBeVisible();
  await shot(page, '03-en');

  // Ticking survives a language switch: the same legal version.
  await page.getByTestId('partner-terms-agree').click();
  await pick(page, 'ar');
  await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('partner-terms-text')).toContainText('Supplier ID');
  await expect(page.getByTestId('partner-terms-agree')).toHaveAttribute('data-state', 'checked');
  await shot(page, '04-ar-rtl');

  await pick(page, 'sr');
  await expect(page.getByTestId('partner-terms-text')).toHaveAttribute('dir', 'ltr');
  await shot(page, '05-sr');
  await pick(page, 'es');
  await shot(page, '06-es');

  await page.getByTestId('partner-terms-agree').click();
  await expect(page.getByTestId('partner-terms-agree')).toHaveAttribute('data-state', 'unchecked');
  await expect(page.getByTestId('partner-terms-accept')).toBeDisabled();
  await page.getByTestId('partner-terms-agree').scrollIntoViewIfNeeded();
  await shot(page, '07-checkbox-unticked-accept-disabled');
  await page.getByTestId('partner-terms-agree').click();
  await expect(page.getByTestId('partner-terms-accept')).toBeEnabled();
  await shot(page, '08-checkbox-ticked-accept-enabled');
  // Accept is never clicked: nothing is accepted on staging.
});
