// VTID-05330 (profile-posts-full-width) — the profile Posts tab card on a
// phone: avatar + name on one header line, the post text and media full width
// below it (owner 2026-10-22, Facebook-style). On desktop the avatar column
// stays as before.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (same flow as the VTID-05210 spec),
// opens that user's public profile (Posts is the default tab on a phone) and
// only reads the layout. It never posts, likes, comments or deletes. Skipped
// (not failed) when the profile has no posts on staging.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // Same read-only POSTs as the VTID-05210 spec (RPC lookups, telemetry, ORB
  // prewarm) — still aborted, never reach the database.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|presence\/did-you-know\/.*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z_-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/(live\/(session\/prewarm|client-latency)|session\/(continuity|live-[^/]+\/audio-blocked)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
/** The documented test user (CLAUDE.md) — only viewed, never written as. */
const TEST_USER_ID = 'a27552a3-0257-4305-8ed0-351a80fd3701';

async function signIn(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
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
}

/** Opens the profile and waits for either a post card or the empty state. Skips when there is no post. */
async function openPosts(page: Page) {
  await page.goto(`/u/${TEST_USER_ID}`, { waitUntil: 'domcontentloaded' });
  const shown = await page
    .getByTestId('profile-post-header')
    .first()
    .waitFor({ state: 'attached', timeout: 45_000 })
    .then(() => true, () => false);
  test.skip(!shown, 'no post card on this profile on staging (no posts yet)');
}

const box = async (page: Page, sel: string) => {
  const b = await page.locator(sel).first().boundingBox();
  expect(b, `${sel} has a box`).toBeTruthy();
  return b!;
};

test('profile Posts tab (phone 390): avatar + name on top, post body full width below', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await openPosts(page);

  const avatar = await box(page, '[data-testid="profile-post-header"] > :first-child');
  const body = await box(page, '[data-testid="profile-post-body"]');
  // The post body starts at the avatar's left edge (not 56 px to its right) and sits below it.
  expect(Math.abs(body.x - avatar.x)).toBeLessThanOrEqual(1);
  expect(body.y).toBeGreaterThanOrEqual(avatar.y + avatar.height - 1);
});

test('profile Posts tab (desktop 1440): the avatar column is kept', async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, request);
  await openPosts(page);

  const bodies = await page.getByTestId('profile-post-body').count();
  test.skip(bodies === 0, 'desktop profile layout shows no post card for this user');
  const avatar = await box(page, '[data-testid="profile-post-header"] > :first-child');
  const body = await box(page, '[data-testid="profile-post-body"]');
  // Desktop as before: the post sits in the column right of the 44 px avatar.
  expect(body.x).toBeGreaterThanOrEqual(avatar.x + avatar.width);
});
