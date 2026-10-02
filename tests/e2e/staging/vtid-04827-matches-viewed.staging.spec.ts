// VTID-04827 — the Matches page records that the member saw their matches.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user and opens /me/matches. When match cards
// are shown, the page must ATTEMPT one daily_matches update that sets only
// viewed_at on the member's own unseen rows for exactly the shown members —
// the guard aborts it, so nothing is written. With no matches (empty state)
// no update is attempted. It taps nothing.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: [
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/(thread_presence|user_activity_log|daily_matches)|functions\/v1\/generate-daily-matches))/,
    // VTID-04855: read-only lookups the signed-in app sends as POST (Supabase RPCs,
    // the membership function, the ORB prewarm). The guard still aborts them —
    // nothing reaches production — this only stops counting them as writes.
    /(supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
  ],
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('the Matches page marks the shown matches as viewed', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
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

  const updates: Array<{ url: string; body: string }> = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && r.url().includes('/rest/v1/daily_matches')) updates.push({ url: decodeURIComponent(r.url()), body: r.postData() ?? '' });
  });

  await page.goto('/me/matches', { waitUntil: 'domcontentloaded' });
  const list = page.getByTestId('matches-list');
  const empty = page.getByTestId('matches-empty');
  await expect(list.or(empty)).toBeVisible({ timeout: 60_000 });

  if (await empty.isVisible()) {
    await page.waitForTimeout(1500);
    expect(updates, 'no matches shown, so nothing is marked').toHaveLength(0);
    return;
  }
  await expect.poll(() => updates.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const u = updates[0];
  expect(Object.keys(JSON.parse(u.body))).toEqual(['viewed_at']);
  expect(u.url).toContain(`user_id=eq.${session.user.id}`);
  expect(u.url).toContain('viewed_at=is.null');
  expect(u.url).toMatch(/matched_user_id=in\.\(/);
  expect(u.url).toMatch(/expires_at=gt\./);
  const shown = await list.locator('li').count();
  const ids = u.url.match(/matched_user_id=in\.\(([^)]*)\)/)![1].split(',');
  expect(ids).toHaveLength(shown);
});
