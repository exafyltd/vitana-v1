// VTID-05085 / VTID-05143 — Unified Card System, Phase 1: enrichment cards on
// Home and Profile.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens Home and /me/profile and reads.
// It never taps a card: no dismiss (a POST), no action button, no interests
// save. The write paths are proven in Vitest (useEnrichmentCards.test.ts,
// enrichment-cards.test.tsx, InterestsPicker.test.tsx) and gateway Jest.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // VTID-04855: one RegExp. Read-only lookups the signed-in app sends as POST
  // (Supabase RPCs, list_my_memberships, the ORB prewarm) — still aborted.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|presence\/did-you-know\/.*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z_-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

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

function waitForCards(page: Page, screen: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'GET' && r.url().includes(`/api/v1/enrichment-cards?screen=${screen}`),
    { timeout: 60_000 },
  );
}

test('Home asks for the enrichment cards and shows at most 3 new cards; Profile shows the strip or nothing', async ({ page, request }) => {
  await signIn(page, request);

  // ── Home ──
  const homeCards = waitForCards(page, 'home');
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  const home = await homeCards;
  expect(home.status(), 'GET enrichment-cards?screen=home').toBe(200);
  expect(home.headers()['content-type'] ?? '').toContain('application/json');
  const homeBody = await home.json();
  expect(homeBody.ok).toBe(true);
  expect(Array.isArray(homeBody.cards)).toBe(true);
  const expectedOnHome = Math.min(2, homeBody.cards.filter((c: { category: string }) => c.category === 'enrichment').length);
  await page.waitForTimeout(3000);
  const rendered = await page.locator('[data-vitana-card^="E"]').count();
  expect(rendered, 'new cards on Home').toBeLessThanOrEqual(3);
  // The feed renders them only once posts load; never more than the server offered.
  expect(rendered).toBeLessThanOrEqual(expectedOnHome);

  // ── Profile ──
  const profileCards = waitForCards(page, 'profile');
  await page.goto('/me/profile', { waitUntil: 'domcontentloaded' });
  const profile = await profileCards;
  expect(profile.status(), 'GET enrichment-cards?screen=profile').toBe(200);
  const profileBody = await profile.json();
  const strip = page.getByTestId('vitana-card-strip-profile-server').first();
  if (profileBody.cards.length > 0) {
    await expect(strip).toBeVisible({ timeout: 30_000 });
    await expect(strip.locator('[data-vitana-card]').first()).toBeVisible();
  } else {
    await page.waitForTimeout(2000);
    await expect(strip).toHaveCount(0);
  }
});
