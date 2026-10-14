// VTID-05172 — Life Timeline P6: Memory overview + Permissions on staging, signed in.
//
//   Phone 390x844 and desktop 1440x900 (?spotlight=0 and ?spotlight=1):
//   /memory leads with this week's Vitana Index story (or an honest "no Index
//   yet") and the routines card; no mock "Last synced" text; /memory/permissions
//   shows the learning switches (five pillars, life areas, app usage) and the
//   usage-data card; nothing scrolls sideways in LTR or RTL. Desktop
//   ?spotlight=1 renders the ScreenFrame frame.
//
// Read-only. './staging-guard' aborts every write; the sign-in token call is
// the only one allowed. This spec never flips a switch, never exports, never
// deletes and never forgets a routine.
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/(user_activity_log|rpc\/[a-z_]+)|functions\/v1\/[a-z_-]+))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

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
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
    localStorage.removeItem('vitana.spotlight');
  }, session);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.waitForTimeout(300);
  expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
}

async function expectOverview(page: Page) {
  await expect(page.getByTestId('memory-overview')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('memory-week-story').or(page.getByTestId('memory-week-empty'))).toBeVisible({ timeout: 30_000 });
  const text = (await page.getByTestId('memory-overview').textContent()) ?? '';
  expect(text, 'mock content').not.toMatch(/Last synced|Wellness Center|lovable-uploads/);
}

async function expectPermissions(page: Page) {
  await expect(page.getByTestId('memory-permissions')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('memory-learning-switches')).toBeVisible({ timeout: 30_000 });
  for (const c of ['nutrition', 'hydration', 'exercise', 'sleep', 'mental', 'community', 'app_usage']) {
    await expect(page.getByTestId(`learn-switch-${c}`)).toBeVisible();
  }
  await expect(page.getByTestId('memory-usage-data')).toBeVisible();
  const text = (await page.getByTestId('memory-permissions').textContent()) ?? '';
  expect(text, 'old stock cards').not.toMatch(/Biometric Authentication|Emergency Access Protocols|Research Participation/);
}

test.describe('VTID-05172 memory refresh', () => {
  test('phone 390x844: overview + permissions, no sideways scroll', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request);
    await page.goto('/memory', { waitUntil: 'domcontentloaded' });
    await expectOverview(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/memory/permissions', { waitUntil: 'domcontentloaded' });
    await expectPermissions(page);
    await expectNoSidewaysScroll(page);
  });

  test('desktop 1440x900 with Spotlight off and on', async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    for (const flag of ['0', '1']) {
      await page.goto(`/memory?spotlight=${flag}`, { waitUntil: 'domcontentloaded' });
      await expectOverview(page);
      if (flag === '1') await expect(page.locator('[data-spotlight-stage]').first()).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.goto(`/memory/permissions?spotlight=${flag}`, { waitUntil: 'domcontentloaded' });
      await expectPermissions(page);
      if (flag === '1') await expect(page.locator('[data-archetype="collection"]').first()).toBeVisible();
      await expectNoSidewaysScroll(page);
    }
  });
});
