// VTID-04812 / VTID-04852 — the calendar has no text/mic bar, uses the app's own
// font and follows the Vitana Index page (pale blue hero, bold weekday title).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /calendar and checks that the
// only add control is the + button (no text-and-microphone bar), that the page
// does not set its own typeface, and that the title uses the app's standard
// header style. It taps nothing.
import { test, expect } from './staging-guard';

test.use({
  // VTID-04855: one RegExp, not an array — Playwright reads an array option as
  // its [value, options] tuple and would keep only the first pattern. The last
  // alternatives are read-only lookups the signed-in app sends as POST (Supabase
  // RPCs, list_my_memberships, the ORB prewarm): still aborted, never writes.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('the calendar has only the + button and uses the app font', async ({ page, request }) => {
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

  // VTID-04871: the role gate (ProtectedRoute) shows a spinner while the role
  // preference loads, and that lookup is a POST RPC the staging guard aborts.
  // React Query then retries it and the calendar flips back to the spinner on
  // every retry, so the + button was "not found" moments after the page drew.
  // Answer that one read-only lookup here with the test user's real role
  // (community): nothing reaches Supabase, and the guard still aborts every
  // other write.
  await page.route(/\/rest\/v1\/rpc\/get_role_preference(\?|$)/, (route) => route.fulfill({ json: [{ role: 'community' }] }));

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  const pageEl = page.getByTestId('vcal-page');
  await expect(pageEl).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('vcal-add')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('vcal-voice-add')).toHaveCount(0);

  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  const calFont = await pageEl.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(calFont, 'the calendar sets its own typeface').toBe(bodyFont);
  expect(calFont).not.toMatch(/nunito/i);

  // The title is the Index page's: 24px (text-2xl), bold.
  const title = page.getByTestId('vcal-date');
  await expect(title).toBeVisible({ timeout: 20_000 });
  const style = await title.evaluate((el) => {
    const c = getComputedStyle(el);
    return { size: c.fontSize, weight: Number(c.fontWeight) };
  });
  expect(style.size).toBe('24px');
  expect(style.weight).toBeGreaterThanOrEqual(700);

  // VTID-04952: the header is the pale blue hero card; the eyebrow names the view;
  // the day number is a lively blend (never the Vitana Index's teal-green).
  const header = page.getByTestId('vcal-header');
  const hero = await header.evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(hero).toContain('linear-gradient');
  const number = page.getByTestId('vcal-day-number');
  await expect(number).toBeVisible();
  expect(await number.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  expect((await number.innerText()).trim()).toBe(String(new Date().getDate()));

  // The Day view starts with "new entry for this day" (a button, never a text field).
  const addDay = page.getByTestId('vcal-add-day');
  await expect(addDay).toBeVisible();
  expect(await page.getByTestId('vcal-day').locator('input, textarea').count()).toBe(0);

  // Day, Week and Month share one hero: same size, and the content starts at the same place.
  const box = async () => {
    const h = (await header.boundingBox())!;
    const tabs = (await page.getByRole('tablist').boundingBox())!;
    return { height: Math.round(h.height), width: Math.round(h.width), tabsTop: Math.round(tabs.y) };
  };
  const day = await box();
  await page.getByRole('tab').nth(1).click();
  await expect(page.getByTestId('vcal-week')).toBeVisible({ timeout: 20_000 });
  const week = await box();
  await page.getByRole('tab').nth(2).click();
  await expect(page.getByTestId('vcal-month')).toBeVisible({ timeout: 20_000 });
  const month = await box();
  expect(week.height).toBe(day.height);
  expect(month.height).toBe(day.height);
  expect(week.tabsTop).toBe(day.tabsTop);
  expect(month.tabsTop).toBe(day.tabsTop);
});
