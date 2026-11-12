// VTID-05719 — desktop sidebar: Vitanaland wordmark, quiet nav groups, dock footer.
// Read-only: './staging-guard' aborts every write (sign-in is the only write allowed).
// Desktop only; the mobile drawer is out of scope for this change.
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1400, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|analytics\/events\/batch|orb\/)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

// The 14 community routes of communityNavigation (role-navigation.ts).
const COMMUNITY_PATHS = [
  '/home', '/autopilot', '/comm', '/discover', '/business', '/inbox', '/health',
  '/connectors', '/assistant', '/wallet', '/sharing', '/memory', '/settings', '/support',
];

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

test('desktop sidebar shows the wordmark, all 14 community routes and the four groups', async ({ page, request }) => {
  await signIn(page, request);
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar).toBeVisible({ timeout: 30_000 });

  // Wordmark: one word, "Vitanaland" (not the old "VITANA").
  await expect(sidebar.getByText('Vitanaland', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('VITANA', { exact: true })).toHaveCount(0);

  // All 14 community routes are present in the sidebar.
  for (const path of COMMUNITY_PATHS) {
    await expect(sidebar.locator(`a[href="${path}"]`), `sidebar link ${path}`).toHaveCount(1);
  }

  // The four quiet group labels render (German or English labels, so match the keys' two forms).
  for (const label of [/^(Start)$/, /^(Verbinden|Connect)$/, /^(Wachsen|Grow)$/, /^(Konto|Account)$/]) {
    await expect(sidebar.getByText(label).first()).toBeAttached();
  }

  // Layout measurements (desktop 1400x900). These fail the run instead of relying on a reviewer's eye.
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(500);
  const box = async (loc: ReturnType<typeof sidebar.locator>) => {
    const b = await loc.first().boundingBox();
    expect(b, 'element has a bounding box').not.toBeNull();
    return b!;
  };
  // Search bar bottom -> first group label top: 10px token (allow 4..16px for rounding).
  const searchInput = sidebar.locator('input').first();
  const searchBox = await box(searchInput);
  const startLabel = await box(sidebar.getByText(/^start$/i));
  const gapSearchToLabel = startLabel.y - (searchBox.y + searchBox.height);
  expect(gapSearchToLabel, 'gap search bar -> START label').toBeGreaterThanOrEqual(4);
  expect(gapSearchToLabel, 'gap search bar -> START label').toBeLessThanOrEqual(16);
  // The chips inside the dock: no text overflows its own chip (scrollWidth must fit clientWidth).
  const overflowing = await sidebar.evaluate((root) => {
    const chips = Array.from(root.querySelectorAll<HTMLElement>('button, div.rounded-xl'));
    return chips
      .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent?.trim().slice(0, 40) ?? '');
  });
  expect(overflowing, 'text overflowing a footer chip').toEqual([]);
  // Nothing in the sidebar may extend past the sidebar's right edge.
  const sidebarBox = await box(sidebar);
  const outside = await sidebar.evaluate((root, right) => {
    return Array.from(root.querySelectorAll<HTMLElement>('*'))
      .filter((el) => el.getBoundingClientRect().right > right + 1 && el.getBoundingClientRect().width > 0)
      .map((el) => el.textContent?.trim().slice(0, 40) ?? el.tagName)
      .slice(0, 5);
  }, sidebarBox.x + sidebarBox.width);
  expect(outside, 'elements past the sidebar right edge').toEqual([]);

  // Evidence for the reviewer: screenshots saved to visual/ (uploaded as a CI artifact by PR-GATE).
  const { mkdirSync } = await import('node:fs');
  mkdirSync('visual', { recursive: true });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'visual/desktop-page-1400x900.png' });
  await sidebar.screenshot({ path: 'visual/desktop-sidebar-1400x900.png' });
  // Also print the sidebar PNG into the job log (base64), so it can be read without a download.
  const sidebarPng = await sidebar.screenshot();
  console.log('VISUAL_PNG_B64_BEGIN desktop-sidebar-1400x900');
  console.log(sidebarPng.toString('base64'));
  console.log('VISUAL_PNG_B64_END');
});
