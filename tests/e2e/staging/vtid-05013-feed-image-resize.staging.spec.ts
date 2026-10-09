// VTID-05013 — News feed photos load from the storage image CDN (resized), not
// the phone's full-size original, and a returning card keeps its height
// (no reflow) after switching to Events and back.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /home on a phone viewport, reads
// the first photo, taps the Events tab and then the News tab. Nothing is
// posted, liked or changed.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 390, height: 844 },
  // Same read-only lookups the signed-in app sends as POST as in VTID-04773's
  // spec: still aborted, never writes.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

test('feed photos come from the resize CDN and keep their height after a tab round-trip', async ({ page, request }) => {
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

  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('feed-media').first()).toBeAttached({ timeout: 45_000 });

  // The first feed photo hosted in Supabase storage (external images are left as-is by design).
  const photo = page.locator('[data-testid="feed-media-image"][src*="supabase.co/storage/"]').first();
  await expect(photo, 'no Supabase-hosted photo in the feed to check').toBeAttached({ timeout: 30_000 });
  const src = (await photo.getAttribute('src')) ?? '';
  expect(src, 'feed photo is not served through the resize CDN').toContain('/storage/v1/render/image/public/');
  expect(src).toContain('width=1200');

  await photo.scrollIntoViewIfNeeded();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30_000, message: 'resized photo did not load' })
    .toBe(true);
  // Loaded from the CDN, not via the onError fallback to the original.
  expect(await photo.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('/storage/v1/render/image/public/');

  const frame = page.locator('[data-testid="feed-media"]').filter({ has: page.locator(`img[src="${src}"]`) }).first();
  const heightBefore = (await frame.boundingBox())?.height ?? 0;
  expect(heightBefore).toBeGreaterThan(0);

  // In-app tab round-trip (no reload): News -> Events -> News.
  await page.locator('a[href="/comm/events-meetups"]').first().click();
  await expect(page).toHaveURL(/\/comm\/events-meetups/);
  await page.locator('a[href="/home"]').first().click();
  await expect(page).toHaveURL(/\/home/);

  // The remounted frame paints at its remembered height straight away.
  const frameAfter = page.locator('[data-testid="feed-media"]').filter({ has: page.locator(`img[src="${src}"]`) }).first();
  await expect(frameAfter).toBeAttached({ timeout: 30_000 });
  const heightAfter = (await frameAfter.boundingBox())?.height ?? 0;
  expect(Math.abs(heightAfter - heightBefore), 'frame height changed after returning to the feed').toBeLessThanOrEqual(1);
});
