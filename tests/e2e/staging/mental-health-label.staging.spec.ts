// VTID-05691 — the fifth pillar is named "Mental Health", not merely "Mental"
// (plan strategy-execution-wave1, lane mental-health-label).
// Read-only: './staging-guard' (copied in by the runner) aborts every write. Nothing is
// clicked, typed or saved; the app language is never changed (a language switch would
// write the member's preference), so the signed-in check reads whatever language the
// test account already uses and expects that locale's committed label.
//
//   1. No sign-in, GETs of the document and static JS only: the deployed English and
//      German catalogues carry the new pillar names ("Mental Health", "Mentale Gesundheit")
//      and no fifth-pillar key of the English catalogue is the bare "Mental" any more.
//   2. Signed in as the test user, /health/plans: the fifth pillar tab shows
//      "🧠 <Mental Health in the app language>" (en: "🧠 Mental Health"), at 1400x900 and
//      390x844, with no horizontal scroll (LTR and dir="rtl").
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;

function plansTabLabel(locale: string): string {
  const shard = JSON.parse(readFileSync(resolve(process.cwd(), `src/i18n/${locale}/screens.json`), 'utf8'));
  return shard.screens.health.mental;
}

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

test('VTID-05691: the deployed en and de catalogues name the fifth pillar Mental Health', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const version = await page.locator('meta[name="vitana-app-version"]').getAttribute('content');
  const sha = process.env.SHA ?? '';
  if (/^[0-9a-f]{40}$/.test(sha)) expect(version, 'deployed build commit').toBe(sha.slice(0, 12));

  const entryUrl = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((src) => src.includes('/assets/index-')) ?? '');
  expect(entryUrl, 'no entry bundle on the page').toBeTruthy();
  const entryRes = await request.get(entryUrl);
  expect(entryRes.status(), 'entry bundle status').toBe(200);
  const entry = await entryRes.text();

  // de is baked into the entry bundle; en is its locale-en-*.js chunk (vite.config.ts manualChunks).
  const chunk = entry.match(/locale-en-[A-Za-z0-9_-]+\.js/)?.[0];
  expect(chunk, 'en: no locale chunk referenced by the entry bundle').toBeTruthy();
  const enRes = await request.get(new URL(`/assets/${chunk}`, entryUrl).toString());
  expect(enRes.status(), `en: ${chunk} status`).toBe(200);
  const en = await enRes.text();

  expect(en.includes('mental:"Mental Health"'), 'en: a fifth-pillar key reads "Mental Health"').toBe(true);
  expect(en.includes('mental:"Mental"'), 'en: no fifth-pillar key is the bare "Mental"').toBe(false);
  // The entry bundle also holds application code, and some components still carry their own
  // hard-coded English pillar maps (proposed follow-ups in docs/validation/VTID-05691/acceptance.md),
  // so only the positive check is made on it.
  expect(entry.includes('mental:"Mentale Gesundheit"'), 'de: a fifth-pillar key reads "Mentale Gesundheit"').toBe(true);
});

test('VTID-05691: /health/plans shows the fifth pillar tab as Mental Health (1400 + 390, LTR/RTL)', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  for (const [width, height] of [
    [1400, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/health/plans', { waitUntil: 'domcontentloaded' });

    const lang = await page.evaluate(() => document.documentElement.lang || 'de');
    const locale = (LOCALES as readonly string[]).includes(lang) ? lang : 'de';
    const label = plansTabLabel(locale);
    if (locale === 'en') expect(label, 'en tab label').toBe('🧠 Mental Health');
    await expect(page.getByText(label, { exact: true }).first(), `${locale}: fifth pillar tab at ${width}px`).toBeVisible({ timeout: 45_000 });

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(await overflow(), `horizontal scroll (LTR, ${width}px)`).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    await page.waitForTimeout(300);
    expect(await overflow(), `horizontal scroll (RTL, ${width}px)`).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'ltr';
    });
  }
});
