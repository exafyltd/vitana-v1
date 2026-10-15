// VTID-05210 — Vitana cards on the own profile (/me/profile): only the cards
// that enrich the profile, and below the profile itself (owner 2026-10-15).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (same flow as the VTID-05085 spec),
// opens /me/profile on a phone and on a desktop viewport and reads the page.
// It never taps a card, never dismisses one and never opens an editor.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // Same read-only POSTs as the VTID-05085 spec (RPC lookups, telemetry, ORB
  // prewarm) — still aborted, never reach the database.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|presence\/did-you-know\/.*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z_-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/(live\/(session\/prewarm|client-latency)|session\/(continuity|live-[^/]+\/audio-blocked)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
/** Kept in step with PROFILE_ENRICHMENT_CARDS in src/components/vitana/vitana-card-catalog.ts. */
const PROFILE_CARDS = new Set(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E11']);
const NEVER_ON_PROFILE = ['E8', 'E9', 'E10', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'G2', 'G3'];

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

/** True when `a` comes before `b` in document order. */
async function isBefore(page: Page, a: string, b: string) {
  return page.evaluate(
    ([sa, sb]) => {
      const x = document.querySelector(sa);
      const y = document.querySelector(sb);
      return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
    },
    [a, b],
  );
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`/me/profile (${viewport.name}): the ID card comes first, and only profile-enriching cards follow below it`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page, request);

    const cardsResponse = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().includes('/api/v1/enrichment-cards?screen=profile'),
      { timeout: 60_000 },
    );
    await page.goto('/me/profile', { waitUntil: 'domcontentloaded' });
    const res = await cardsResponse;
    expect(res.status(), 'GET enrichment-cards?screen=profile').toBe(200);
    const body = (await res.json()) as { cards: Array<{ card_type: string; category: string }> };

    const idCard = page.getByTestId('profile-id-card').first();
    await expect(idCard).toBeVisible({ timeout: 30_000 });
    // Let both strips settle (they render only after the cards request resolves).
    await page.waitForTimeout(3000);

    const server = page.getByTestId('vitana-card-strip-profile-server');
    const features = page.getByTestId('vitana-card-strip-profile-features');
    const expectedServer = body.cards.filter((c) => c.category === 'enrichment' && PROFILE_CARDS.has(c.card_type)).length;
    const g1Fired = body.cards.some((c) => c.card_type === 'G1');

    // R1 — only the profile cards; the stacked half is G1 alone.
    if (expectedServer > 0) {
      await expect(server).toHaveCount(1);
      await expect(server.locator('[data-vitana-card]')).toHaveCount(Math.min(expectedServer, PROFILE_CARDS.size));
    } else {
      await expect(server).toHaveCount(0);
    }
    if (g1Fired) {
      await expect(features).toHaveCount(1);
      await expect(features.locator('[data-vitana-card]')).toHaveCount(1);
      await expect(features.locator('[data-vitana-card="G1"]')).toHaveCount(1);
    } else {
      await expect(features).toHaveCount(0);
    }
    for (const t of NEVER_ON_PROFILE) {
      await expect(page.locator(`[data-vitana-card="${t}"]`), `${t} on the profile`).toHaveCount(0);
    }

    // R2 — the member's profile comes first: every strip sits after the ID card.
    if (expectedServer > 0) {
      expect(await isBefore(page, '[data-testid="profile-id-card"]', '[data-testid="vitana-card-strip-profile-server"]')).toBe(true);
    }
    if (g1Fired) {
      expect(await isBefore(page, '[data-testid="profile-id-card"]', '[data-testid="vitana-card-strip-profile-features"]')).toBe(true);
    }
    if (expectedServer > 0 && g1Fired) {
      // G1 "Complete your profile" first, then the carousel of concrete steps.
      expect(await isBefore(page, '[data-testid="vitana-card-strip-profile-features"]', '[data-testid="vitana-card-strip-profile-server"]')).toBe(true);
    }
  });
}
