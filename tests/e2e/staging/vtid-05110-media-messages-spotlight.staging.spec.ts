// VTID-05110 — Media Hub (/comm/media-hub) and Messages (/inbox) on the
// Spotlight design, desktop 1440x900.
//
//   Spotlight off (?spotlight=0): both screens render today's layout — no
//   ScreenFrame. Spotlight on (?spotlight=1, the preview override; the tenant
//   flag is not touched): Media Hub is a focus-feed (one spotlight card in the
//   first viewport, rail holds only compact/row cards), Messages is a
//   conversation screen (list column + thread stage that fits the viewport).
//   The sidebar chrome stays intact and nothing scrolls sideways.
//
// Read-only. './staging-guard' aborts every write; the sign-in token call is
// the only one allowed. This spec only navigates, switches tabs and reads the
// DOM. It never types into a composer, never clicks send, never presses play
// (a short or track would record a view), and never opens a thread itself —
// the read receipt the inbox's own desktop auto-select may attempt is a write
// the guard aborts (listed in allowAbortedWrites, as in the VTID-04955 spec).
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read|chat\/[a-z0-9/_-]*read[a-z0-9/_-]*)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|global_thread_participants|chat_messages)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
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
    localStorage.removeItem('vitana.spotlight');
    sessionStorage.removeItem('vitana.inbox.lastState');
  }, session);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

async function expectSidebarChrome(page: Page) {
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
  expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
  await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);
}

/** Spotlight cards whose box intersects the first viewport. */
async function spotlightCardsInFirstViewport(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-spotlight-stage] [data-vcard-size="spotlight"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
    }).length,
  );
}

for (const route of ['/comm/media-hub', '/inbox']) {
  test(`VTID-05110: ${route} with Spotlight off renders today's layout`, async ({ page, request }) => {
    await signIn(page, request);
    await page.goto(`${route}?spotlight=0`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('[data-archetype]')).toHaveCount(0);
    await expectSidebarChrome(page);
  });
}

test('VTID-05110: Media Hub with Spotlight on is a focus-feed — one spotlight card per tab, compact/row rail', async ({ page, request }) => {
  await signIn(page, request);
  await page.goto('/comm/media-hub?spotlight=1', { waitUntil: 'domcontentloaded' });
  const frame = page.locator('[data-archetype="focus-feed"]');
  await expect(frame).toBeVisible({ timeout: 25_000 });
  await expect(frame.locator('[data-header-density="compact"]').first()).toBeVisible();
  await expectSidebarChrome(page);

  for (const tab of ['shorts', 'music', 'podcasts'] as const) {
    if (tab !== 'shorts') await frame.getByRole('tab').nth(tab === 'music' ? 1 : 2).click();
    const stage = frame.locator(`[data-media-tab="${tab}"]`);
    await expect(stage).toBeVisible();
    // Wait for the archetype skeleton to give way to content or an empty/error state.
    await expect(stage.locator('[data-archetype-skeleton]')).toHaveCount(0, { timeout: 20_000 });
    const cards = await stage.locator('[data-vcard-size="spotlight"]').count();
    if (cards > 0) {
      expect(await spotlightCardsInFirstViewport(page), `${tab}: SR-06 one spotlight card in the first viewport`).toBe(1);
      if (tab !== 'shorts') expect(cards, `${tab}: only one spotlight card on the stage`).toBe(1);
    }
    const railSizes = await page.locator('aside[data-spotlight-rail] [data-vcard-size]').evaluateAll((els) => els.map((e) => e.getAttribute('data-vcard-size')));
    railSizes.forEach((s) => expect(['compact', 'row'], 'SR-08 rail card size').toContain(s));
    await expectNoHorizontalScroll(page);
  }
  // No page spinner after the first load.
  await expect(page.locator('main .animate-spin')).toHaveCount(0);
});

test('VTID-05110: Messages with Spotlight on is a conversation screen that fits the viewport', async ({ page, request }) => {
  await signIn(page, request);
  await page.goto('/inbox?spotlight=1', { waitUntil: 'domcontentloaded' });
  const frame = page.locator('[data-archetype="conversation"]');
  await expect(frame).toBeVisible({ timeout: 25_000 });
  await expectSidebarChrome(page);

  const layout = frame.locator('[data-conversation-layout]');
  await expect(layout).toBeVisible({ timeout: 25_000 });
  const list = frame.getByRole('region', { name: /Unterhaltungen|Conversations/ });
  const stage = frame.locator('[data-thread-stage]');
  await expect(list).toBeVisible();
  await expect(stage).toBeVisible();
  // List rows are row cards; nothing on a conversation screen uses the spotlight size.
  const rowSizes = await list.locator('[data-vcard-size]').evaluateAll((els) => els.map((e) => e.getAttribute('data-vcard-size')));
  rowSizes.forEach((s) => expect(s).toBe('row'));
  await expect(frame.locator('[data-vcard-size="spotlight"]')).toHaveCount(0);

  // The list column and the thread stage end inside the viewport, so an open
  // thread's composer is on screen without scrolling the page (looked at only).
  const box = await layout.boundingBox();
  expect(box, 'conversation layout has no box').toBeTruthy();
  expect(box!.y + box!.height).toBeLessThanOrEqual(900 + 1);
  const composer = stage.locator('textarea, [contenteditable="true"]').first();
  if ((await composer.count()) > 0) {
    const c = await composer.boundingBox();
    expect(c && c.y + c.height <= 900 + 1, 'composer is inside the viewport').toBeTruthy();
  }
  await expectNoHorizontalScroll(page);
});
