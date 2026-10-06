// VTID-04756 — the connect card shows each calendar app's own icon, not a letter.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /calendar and looks at the
// connect card: Google and Outlook draw an SVG icon, Apple draws today's date.
// It taps nothing. Skipped when the test user already has a calendar connected
// (no connect card).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('the connect card shows the Google, Apple and Outlook icons', async ({ page, request }) => {
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

  for (const app of ['google', 'outlook']) {
    const icon = page.getByTestId(`vcal-connect-${app}`).locator('svg');
    await expect(icon).toBeVisible();
    const box = await icon.boundingBox();
    expect(box && box.width >= 40, `${app} icon is drawn at a recognisable size`).toBe(true);
  }
  // Apple's icon is today's date, like the app itself.
  const apple = page.getByTestId('vcal-connect-apple');
  await expect(apple).toContainText(String(new Date().getDate()));
});
