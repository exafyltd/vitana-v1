// VTID-05622 — the group chat opens at its newest message and is never painted
// at the top. Read-only: './staging-guard' aborts every write, nothing is clicked
// except navigation to the first group the test account is in.
//
// Method: a requestAnimationFrame probe installed before the app loads records,
// for every frame in which the group list is visible, whether the newest message is
// cut by the composer and whether it moved after the list was first shown.
// The test fails when there is no group to open.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/rpc\/[a-z_]+)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const bundleUrl = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(bundleUrl)).text();
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

// Installed before any app script runs. For every animation frame in which the
// conversation list is visible it records (a) whether the newest message's bottom
// edge is hidden behind the composer ("cut"), and (b) how far that edge moved
// since the first visible frame ("movedPx"). Both must stay at zero for the
// opening: a cut or a movement is what a member sees as a scroll.
const PROBE = () => {
  type Probe = { visibleFrames: number; cutFrames: number; worstCutPx: number; firstBottom: number | null; movedPx: number; lastBottom: number | null };
  const w = window as unknown as { __open: Probe };
  w.__open = { visibleFrames: 0, cutFrames: 0, worstCutPx: 0, firstBottom: null, movedPx: 0, lastBottom: null };
  const tick = () => {
    const main = document.querySelector<HTMLElement>('main[tabindex="-1"]');
    if (main && /\/inbox\/g\//.test(location.pathname) && main.style.visibility !== 'hidden' && main.textContent && main.textContent.trim().length > 0) {
      const msgs = document.querySelectorAll<HTMLElement>('[id^="msg-"]');
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      const footer = document.querySelector<HTMLElement>('footer');
      if (last && footer) {
        const bottom = last.getBoundingClientRect().bottom;
        const limit = footer.getBoundingClientRect().top;
        const cut = Math.round(bottom - limit);
        w.__open.visibleFrames += 1;
        if (w.__open.firstBottom === null) w.__open.firstBottom = bottom;
        w.__open.movedPx = Math.max(w.__open.movedPx, Math.round(Math.abs(bottom - (w.__open.firstBottom as number))));
        w.__open.lastBottom = bottom;
        if (cut > 2) {
          w.__open.cutFrames += 1;
          w.__open.worstCutPx = Math.max(w.__open.worstCutPx, cut);
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

test('a group chat is first shown at its newest message, never scrolled into view', async ({ page, request }) => {
  await page.addInitScript(PROBE);
  await signIn(page, request);
  await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
  const link = page.locator('a[href^="/inbox/g/"]').first();
  await expect(link, 'the test account is in no group, so the opening check cannot run').toBeVisible({ timeout: 30_000 });
  await link.click();
  await page.waitForURL(/\/inbox\/g\//, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const probe = await page.evaluate(() => (window as unknown as { __open: { visibleFrames: number; cutFrames: number; worstCutPx: number; movedPx: number } }).__open);
  expect(probe.visibleFrames, 'the group list was never shown').toBeGreaterThan(0);
  expect(probe.cutFrames, `the newest message was hidden behind the composer in ${probe.cutFrames} frame(s), worst ${probe.worstCutPx}px`).toBe(0);
  expect(probe.movedPx, `the newest message moved ${probe.movedPx}px after the list was first shown`).toBeLessThanOrEqual(4);
});
