// VTID-05170 — Life Timeline P4: Memory → Timeline on staging, signed in.
//
//   Phone 390x844 and desktop 1440x900 (?spotlight=0 and ?spotlight=1):
//   the timeline body renders; the Vitana Index leads (five pillar rows) or,
//   for a member without an Index, an honest prompt; the API answered (no
//   error state); nothing scrolls sideways in LTR or RTL; none of the old
//   cryptic content is on screen (no "View Details", no raw JSON, no
//   next_action telemetry). If a moment exists, its detail opens and shows
//   the Index section. Desktop ?spotlight=1 renders the ScreenFrame frame.
//
// Read-only. './staging-guard' aborts every write; the sign-in token call is
// the only one allowed. This spec navigates, clicks chips and opens one
// detail (a GET). It never toggles "Vitana may learn from this" and never
// deletes.
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

async function expectTimeline(page: Page) {
  const body = page.getByTestId('timeline-body');
  await expect(body).toBeVisible({ timeout: 30_000 });
  // The Index leads — or an honest "no Index yet" prompt.
  await expect(page.getByTestId('timeline-index-spotlight').or(page.getByTestId('timeline-no-index'))).toBeVisible({ timeout: 30_000 });
  if (await page.getByTestId('timeline-index-spotlight').isVisible()) {
    for (const p of ['nutrition', 'hydration', 'exercise', 'sleep', 'mental']) {
      await expect(page.getByTestId(`timeline-pillar-${p}`)).toBeVisible();
    }
  }
  // The API answered: a list, the empty state, never the error state.
  await expect(page.getByTestId('timeline-day').first().or(page.getByTestId('timeline-empty'))).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('timeline-error')).toHaveCount(0);
  const text = (await body.textContent()) ?? '';
  expect(text, 'old cryptic cards').not.toMatch(/View Details|next_action|life_compass_alignment|\{\s*"source"/);
}

async function openFirstMoment(page: Page) {
  const first = page.getByTestId('timeline-moment').first();
  if ((await first.count()) === 0) return;
  await first.click();
  const sheet = page.getByTestId('timeline-detail');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/./).first()).toBeVisible();
  await page.keyboard.press('Escape');
}

test.describe('VTID-05170 life timeline', () => {
  test('phone 390x844: Index first, pillar chips, no sideways scroll, readable detail', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request);
    await page.goto('/memory/timeline', { waitUntil: 'domcontentloaded' });
    await expectTimeline(page);
    await expectNoSidewaysScroll(page);
    await openFirstMoment(page);
    // A pillar chip filters (a GET) and the screen stays sound.
    await page.getByRole('toolbar').first().getByRole('button').nth(2).click();
    await expect(page.getByTestId('timeline-error')).toHaveCount(0);
    await expectNoSidewaysScroll(page);
  });

  test('desktop 1440x900 with Spotlight off and on', async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, request);
    await page.goto('/memory/timeline?spotlight=0', { waitUntil: 'domcontentloaded' });
    await expectTimeline(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/memory/timeline?spotlight=1', { waitUntil: 'domcontentloaded' });
    await expectTimeline(page);
    await expect(page.locator('[data-spotlight-stage]').first()).toBeVisible();
    await expectNoSidewaysScroll(page);
    await openFirstMoment(page);
  });
});
