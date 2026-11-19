// __VTID__ (news-feed-post-action-row) — News Feed post card on a phone: who
// posted on one row (avatar, name, ⋮), like / comment / send on their own row
// below it, so the actions no longer crowd the author (owner 2026-11-19).
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (the token call is the only write
// allowed), opens /home and measures the first post card. Nothing is
// written: the heart and the comment box are never used. The checks open and
// close the comment list, the send sheet, the likers dialog and the ⋮ menu
// (GETs only; the guard aborts any write) and press Escape without choosing
// anything. Skipped (not failed) when the feed shows no post card.
// Heart toggling and sending are proven by the Vitest suite and the local
// harness evidence on vitana-platform#5120, never on staging.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  // Same read-only POSTs as the VTID-05330 spec (RPC lookups, telemetry, ORB
  // prewarm) — still aborted, never reach the database.
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|presence\/did-you-know\/.*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z_-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/(live\/(session\/prewarm|client-latency)|session\/(continuity|live-[^/]+\/audio-blocked)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: Page, request: APIRequestContext) {
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
}

// The feed re-renders while profile lookups settle, so every measurement is one
// in-page evaluate on the live card, polled until it returns a reading.
const measure = () => {
  const author = document.querySelector('[data-testid="post-author-row"]');
  if (!author || !author.isConnected) return null;
  const actions = author.parentElement?.querySelector('[data-testid="post-action-row"]');
  if (!actions) return null;
  const a = author.getBoundingClientRect();
  const r = actions.getBoundingClientRect();
  if (!a.height || !r.height) return null;
  const heights = [...actions.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height));
  const name = author.querySelector('[data-testid="post-author-name"]')?.textContent ?? '';
  return {
    authorBottom: Math.round(a.bottom),
    actionsTop: Math.round(r.top),
    actionsOnAuthorRow: author.querySelectorAll('button[aria-pressed], button[aria-expanded], [data-testid="post-send-in-message"]').length,
    hasLike: !!actions.querySelector('button[aria-pressed]'),
    hasComment: !!actions.querySelector('button[aria-expanded]'),
    nameOnActionRow: !!name && (actions.textContent ?? '').includes(name),
    minButtonHeight: heights.length ? Math.min(...heights) : 0,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
};

async function firstPostCard(page: Page) {
  let m = null as ReturnType<typeof measure>;
  try {
    await expect.poll(async () => (m = await page.evaluate(measure)) !== null, { timeout: 45_000, intervals: [500, 1000] }).toBe(true);
  } catch {
    test.skip(true, 'no post card in the News Feed for this account');
  }
  return m!;
}

for (const size of [
  { name: 'phone', width: 390, height: 844, path: '/home' },
  // ?spotlight=0 keeps the classic feed column on desktop (the Spotlight stage card is not part of this change).
  { name: 'desktop', width: 1400, height: 900, path: '/home?spotlight=0' },
]) {
  test(`__VTID__: News Feed post actions sit on their own row below the author (${size.name} ${size.width}x${size.height})`, async ({ page, request }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(size.path, { waitUntil: 'domcontentloaded' });

    const m = await firstPostCard(page);
    expect(m.hasLike, 'like button not on the action row').toBe(true);
    expect(m.hasComment, 'comment button not on the action row').toBe(true);
    expect(m.actionsOnAuthorRow, 'an action control is still on the author row').toBe(0);
    expect(m.nameOnActionRow, 'the author name is on the action row').toBe(false);
    expect(m.actionsTop, 'the action row is not below the author row').toBeGreaterThanOrEqual(m.authorBottom);
    expect(m.minButtonHeight, 'an action tap target is under 44 px high').toBeGreaterThanOrEqual(44);
    expect(m.overflow, 'the feed scrolls sideways').toBeLessThanOrEqual(0);
    await page.screenshot({ path: test.info().outputPath(`${size.name}-feed.png`) });

    // Read-only interactions on the first card: open and close, never submit.
    const author = page.getByTestId('post-author-row').first();
    const actions = page.getByTestId('post-action-row').first();
    const comment = actions.locator('button[aria-expanded]');
    await comment.click();
    await expect(comment).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: test.info().outputPath(`${size.name}-comments-open.png`) });
    await comment.click();
    await expect(comment).toHaveAttribute('aria-expanded', 'false');

    const send = actions.getByTestId('post-send-in-message');
    if (await send.count()) {
      await send.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`${size.name}-send-sheet.png`) });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }

    const likes = actions.locator('button:not([aria-pressed]):not([aria-expanded]):not([data-testid])');
    if (await likes.count()) {
      await likes.first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`${size.name}-likers.png`) });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }

    await author.locator('button').first().click();
    await expect(page.getByRole('menuitem').first()).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`${size.name}-menu.png`) });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });
}
