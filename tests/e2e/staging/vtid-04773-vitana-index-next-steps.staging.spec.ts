// VTID-04773 — "Understand index" opens the redesigned Vitana Index page with
// the member's next steps (blood test, connect a tracker, weakest pillar, journey).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /health/vitana-index and reads
// the page. The only tap is the local "How your Index grows" disclosure.
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
test('the Vitana Index page shows the score and the next steps to improve it', async ({ page, request }) => {
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

  await page.goto('/health/vitana-index', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('vitana-index-hero')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('vitana-index-score')).toBeVisible({ timeout: 20_000 });

  const steps = page.getByTestId('vitana-index-next-steps');
  await expect(steps).toBeVisible();
  // Blood test and tracker steps are always listed (open, or done with a check).
  await expect(steps.getByTestId('vitana-index-step-blood')).toBeVisible();
  await expect(steps.getByTestId('vitana-index-step-devices')).toBeVisible();
  await expect(steps.getByTestId('vitana-index-step-journey')).toBeVisible();
  // Exactly one highlighted "Next up" step unless everything is done.
  expect(await steps.locator('[data-next-up="true"]').count()).toBeLessThanOrEqual(1);

  const devicesDone = (await steps.getByTestId('vitana-index-step-devices').getAttribute('data-done')) === 'true';
  if (!devicesDone) {
    const trackers = page.getByTestId('vitana-index-trackers');
    await expect(trackers).toContainText('Apple Health');
    await expect(trackers).toContainText('Samsung Health');
  }

  await expect(page.getByTestId('vitana-index-goal')).toBeVisible();
  for (const pillar of ['nutrition', 'hydration', 'exercise', 'sleep', 'mental']) {
    await expect(page.getByTestId(`vitana-index-pillar-${pillar}`)).toBeVisible();
  }

  // Mobile: nothing overflows sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
