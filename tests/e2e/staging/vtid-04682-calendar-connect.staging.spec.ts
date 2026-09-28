// VTID-04682 — connecting Google / Apple / Outlook from the calendar works.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /calendar and taps each app on
// the connect card. With the app's sign-in set up on the stack, the tap hands
// off to Connected Apps; without it, the tap opens that app's subscription
// sheet. Either outcome passes. The spec never taps "create link" (a write).
// Skipped when the test user already has a calendar connected (no connect card).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('each calendar app on the connect card opens its connect path', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

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

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('vcal-date')).toBeVisible({ timeout: 45_000 });
  const card = page.getByTestId('vcal-connect');
  await expect(card.or(page.getByTestId('vcal-section-calendars'))).toBeVisible({ timeout: 20_000 });
  test.skip(!(await card.isVisible()), 'test user already has a calendar connected');

  for (const app of ['google', 'apple', 'outlook']) {
    const button = page.getByTestId(`vcal-connect-${app}`);
    await expect(button).toBeVisible();
    await button.click();
    const sheet = page.getByTestId('vcal-subscribe-sheet');
    await expect
      .poll(async () => (await sheet.isVisible()) || /\/connectors\?.*connect=/.test(page.url()), { timeout: 15_000 })
      .toBe(true);
    if (await sheet.isVisible()) {
      await sheet.locator('button').first().click();
      await expect(sheet).toBeHidden({ timeout: 10_000 });
    } else {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
      await expect(card).toBeVisible({ timeout: 45_000 });
    }
  }
});
