// VTID-04937 — News feed: tapping a post opens the post, only the author name
// opens the profile, and Back returns to the same spot in the feed.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write;
// the sign-in token call is the only one allowed. Taps the body of an existing
// post (never the heart, the comment box or the menu), the post page's back
// arrow, and an author name. Nothing is liked, commented or posted.
import { test, expect } from './staging-guard';

test.use({
  // Same read-only lookups the signed-in Home screen sends as POST as the
  // VTID-04859 spec (one RegExp — see that spec for why not an array).
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

test('a feed post opens itself, Back keeps the feed position, the author name opens the profile', async ({ page, request }) => {
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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  const cards = page.getByTestId('feed-post-card');
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });

  // Go a few posts down, so "back to the same spot" is not trivially the top.
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(400);
  }
  const count = await cards.count();
  const index = Math.min(count - 1, 4);
  const card = cards.nth(index);
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => window.scrollY);

  // Tap the card body: its top-left corner is the media or the reason label —
  // never a button.
  await card.click({ position: { x: 16, y: 10 } });
  await expect(page).toHaveURL(/\/post\/(post|media)\/[0-9a-f-]+$/, { timeout: 10_000 });

  await page.getByTestId('post-detail-back').click();
  await expect(page).toHaveURL(/\/home\/?$/, { timeout: 10_000 });
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 8_000 })
    .toBeGreaterThan(before - 150);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before + 150);

  await cards.nth(index).getByTestId('feed-post-author').click();
  await expect(page).toHaveURL(/\/u\/[0-9a-f-]+$/, { timeout: 10_000 });
});
