// VTID-04773 — "Understand index" opens the redesigned Vitana Index page with
// the member's next steps (blood test, connect a tracker, weakest pillar, journey).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /health/vitana-index and reads
// the page. The only tap is the local "How your Index grows" disclosure.
import { test, expect } from './staging-guard';

// The signed-in app makes its own background POSTs on load (role lookups, the
// profile health summary, memberships, the Orb voice pre-warm, telemetry). The
// guard still aborts every one of them — nothing is written — they are only
// declared here as expected so the test fails on writes it causes itself.
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/live\/session\/prewarm)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/(thread_presence|user_activity_log|rpc\/(get_role_preference|get_my_permitted_roles|get_profile_health_summary|list_roles_for_active_tenant))|functions\/v1\/list_my_memberships))/,
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
