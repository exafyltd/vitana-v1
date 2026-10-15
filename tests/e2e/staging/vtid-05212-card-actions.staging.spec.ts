// VTID-05212 — Vitana card actions that work (plan profile-vitana-cards, R6).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (same flow as the VTID-05085/05210
// specs). It follows deep links and opens editors, but never saves, never
// connects an account and never dismisses a card.
//   1. E8/E9 → /connectors?tab=productivity#calendar|#contacts lands on the
//      Mail, Calendar & Contacts section (phone + desktop) and drops the hash.
//   2. G1 on /me/profile (only when the server shows it to the test user)
//      opens a profile editor instead of doing nothing.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // Same read-only POSTs as the VTID-05085 spec (RPC lookups, telemetry, ORB
  // prewarm) — still aborted, never reach the database.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|presence\/did-you-know\/.*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z_-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/(live\/(session\/prewarm|client-latency)|session\/(continuity|live-[^/]+\/audio-blocked)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
/** Kept in step with MAIL_CALENDAR_CONTACTS_ANCHOR in src/components/settings/connected-apps/anchors.ts. */
const ANCHOR = 'connectors-mail-calendar-contacts';

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

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  for (const hash of ['calendar', 'contacts']) {
    test(`E8/E9 deep link #${hash} (${viewport.name}) lands on Mail, Calendar & Contacts`, async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signIn(page, request);
      await page.goto(`/connectors?tab=productivity#${hash}`, { waitUntil: 'domcontentloaded' });

      const section = page.locator(`#${ANCHOR}`);
      await expect(section).toBeAttached({ timeout: 30_000 });
      await expect(section).toBeInViewport({ timeout: 10_000 });
      // The hash is consumed (so the same link scrolls again); the tab query stays.
      await expect(page).toHaveURL(/\/connectors\?tab=productivity$/);
    });
  }

  test(`G1 on /me/profile (${viewport.name}) opens a profile editor`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page, request);
    const cardsResponse = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().includes('/api/v1/enrichment-cards?screen=profile'),
      { timeout: 60_000 },
    );
    await page.goto('/me/profile', { waitUntil: 'domcontentloaded' });
    const body = (await (await cardsResponse).json()) as { cards: Array<{ card_type: string }> };
    test.skip(!body.cards.some((c) => c.card_type === 'G1'), 'G1 is not shown to the test user (profile ≥ 80 % complete)');

    // Same rule as the card: the first open card with a /me/profile# editor, else About.
    const EDITOR: Record<string, string> = { E1: 'avatar', E2: 'about', E4: 'interests', E5: 'location', E11: 'cover' };
    const step = body.cards.map((c) => EDITOR[c.card_type]).find(Boolean) ?? 'about';

    const button = page.getByTestId('vitana-card-action-G1');
    await expect(button).toBeVisible({ timeout: 30_000 });
    await button.click();
    // The editor hash is consumed: the page acted on it (it used to stay on a bare /me/profile).
    await expect(page).toHaveURL(/\/me\/profile$/);
    // Avatar/About/Location/Interests open a dialog; the Cover Library is its own panel.
    if (step !== 'cover') await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 10_000 });
  });
}
