// VTID-05108 — Spotlight Phase 2: the News screen (/home) as a desktop focus
// feed. Signed in, Spotlight forced on with the preview override
// (?spotlight=1 → localStorage vitana.spotlight), at 1280 / 1440 / 1920 px:
//   - ScreenFrame archetype="focus-feed" frames the screen;
//   - exactly ONE [data-vcard-size="spotlight"] on the screen (SR-06/07);
//   - the context rail is visible at >= 1440 px (below that, its toggle);
//   - no vertical gap > 48 px between stage cards (R4.5);
//   - J / K move the focused card;
//   - no horizontal scroll, also with dir="rtl";
//   - the Vitanaland sidebar chrome is intact (SR-01).
// Plus: with ?spotlight=0 the legacy /home renders unchanged (no ScreenFrame,
// legacy grid). Read-only: './staging-guard' aborts every write; only the
// keyboard is used (J/K scroll the page), nothing is clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
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

async function expectSidebarChrome(page: import('@playwright/test').Page) {
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
  expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
  await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();
}

const STAGE_CARD = '[data-spotlight-stage] [data-focus-item]';

for (const width of [1280, 1440, 1920]) {
  test(`VTID-05108: /home focus feed at ${width}px — one spotlight, rail, no gaps, J/K, RTL, chrome`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto('/home?spotlight=1', { waitUntil: 'domcontentloaded' });

    const frame = page.locator('[data-archetype="focus-feed"]').first();
    await expect(frame).toBeVisible({ timeout: 30_000 });
    await expectSidebarChrome(page);
    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });

    // Real cards, not the skeleton.
    await expect(page.locator(STAGE_CARD).first()).toBeVisible({ timeout: 30_000 });

    // SR-06/07: exactly one spotlight card on the whole screen, and it is in the first viewport.
    expect(await page.locator('[data-vcard-size="spotlight"]').count(), 'spotlight cards on the screen').toBe(1);
    const inFirstViewport = await page.evaluate(() =>
      [...document.querySelectorAll('[data-vcard-size="spotlight"]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      }).length,
    );
    expect(inFirstViewport, 'spotlight card in the first viewport').toBe(1);

    // Rail: visible beside the stage at >= 1440 px; below that it is reachable through its toggle.
    if (width >= 1440) {
      await expect(page.locator('[data-spotlight-rail]').first()).toBeVisible();
    } else {
      const railVisible = await page.locator('[data-spotlight-rail]').first().isVisible();
      const toggleVisible = await page.locator('.sp-rail-toggle button').first().isVisible();
      expect(railVisible || toggleVisible, 'rail or rail toggle').toBe(true);
    }

    // R4.5: no vertical gap > 48 px between stage cards.
    const gaps = await page.evaluate((sel) => {
      const rects = [...document.querySelectorAll(sel)].map((el) => el.getBoundingClientRect());
      const out: number[] = [];
      for (let i = 1; i < rects.length; i++) out.push(Math.round(rects[i].top - rects[i - 1].bottom));
      return out;
    }, STAGE_CARD);
    expect(gaps.length, 'at least two stage cards').toBeGreaterThan(0);
    expect(Math.max(...gaps), `gaps between stage cards: ${gaps.join(', ')}`).toBeLessThanOrEqual(48);

    // J / K move the focused card (keyboard only — no click, no write).
    const focusedKey = () => page.locator(`${STAGE_CARD}[data-focused]`).first().getAttribute('data-focus-key');
    const firstKey = await page.locator(STAGE_CARD).first().getAttribute('data-focus-key');
    const secondKey = await page.locator(STAGE_CARD).nth(1).getAttribute('data-focus-key');
    await expect.poll(focusedKey).toBe(firstKey);
    await page.keyboard.press('j');
    await expect.poll(focusedKey, { timeout: 5_000 }).toBe(secondKey);
    await page.keyboard.press('k');
    await expect.poll(focusedKey, { timeout: 5_000 }).toBe(firstKey);

    // No horizontal scroll, LTR and RTL.
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    await page.waitForTimeout(300);
    expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
    await expectSidebarChrome(page);
  });
}

test('VTID-05108: with Spotlight off (?spotlight=0) /home is the legacy News screen', async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home?spotlight=0', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await expectSidebarChrome(page);
  await expect(page.getByTestId('feed-grid')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-archetype]')).toHaveCount(0);
  await expect(page.locator('[data-vcard-size]')).toHaveCount(0);
});
