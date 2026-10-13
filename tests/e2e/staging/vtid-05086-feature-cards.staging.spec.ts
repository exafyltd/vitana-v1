// VTID-05086 / VTID-05143 — Unified Card System, Phase 2: the card strip on
// Vitana Index, My Journey, Media Hub, Talk to Vitana and Calendar. The strip
// inside the post composer ("Make a Post") is proven in Vitest.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user and visits each screen. It taps
// nothing: no dismiss, no action button.
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

const SCREENS: Array<{ path: string; screen: string }> = [
  { path: '/health/vitana-index', screen: 'vitana-index' },
  { path: '/autopilot', screen: 'autopilot' },
  { path: '/comm/media-hub', screen: 'community' },
  { path: '/comm/talk-to-vitana', screen: 'talk-to-vitana' },
  { path: '/calendar', screen: 'calendar' },
];

test('each screen asks for its cards and shows its card strip, with no console errors', async ({ page, request }) => {
  await signIn(page, request);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  for (const { path, screen } of SCREENS) {
    const cards = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().includes(`/api/v1/enrichment-cards?screen=${screen}`),
      { timeout: 60_000 },
    );
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const res = await cards;
    expect(res.status(), `GET enrichment-cards?screen=${screen}`).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('application/json');
    // Every one of these screens has static feature cards, so the strip is
    // always there (unless the member hid them all on this browser — a fresh
    // test browser has not).
    const strip = page.getByTestId(`vitana-card-strip-${screen}`).first();
    await expect(strip, `${path} card strip`).toBeVisible({ timeout: 30_000 });
    await expect(strip.locator('[data-vitana-card], [data-testid="dyk-card"], button').first()).toBeVisible();
  }

  expect(errors, 'uncaught page errors').toEqual([]);
});
