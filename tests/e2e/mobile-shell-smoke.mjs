/**
 * VTID-04114: mobile shell smoke test — the staging gate a prod publish must
 * pass before it can reach AWS-PROD-DEPLOY-FRONTEND.yml.
 *
 * Built directly in response to a real incident: PR #1114 (bigger sidebar
 * avatar, restructured role pill) shipped straight to 100% of production via
 * a manual workflow_dispatch with zero automated check of any kind. The only
 * "test" covering that component was a source-text grep
 * (SideDrawerNav.role-chrome.test.ts) that never rendered anything.
 *
 * This opens the real staging app in a mobile viewport, authenticates as the
 * documented e2e test user, opens the sidebar drawer (the exact element that
 * broke), and asserts:
 *   1. no uncaught console errors/exceptions during the whole flow
 *   2. the drawer does not cause horizontal viewport overflow
 *   3. the profile avatar renders at a sane size (catches the class of bug
 *      that just happened: an oversized/dominant element)
 *
 * Exit 0 only if every check passes. Screenshots are uploaded as a CI
 * artifact either way, since a screenshot is evidence a pass/fail line is not.
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const SUPA = process.env.SUPA_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.SUPA_ANON ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'VitanaE2eTest2026!';
const BASE = (process.env.STAGING_URL || 'https://preview-aws.vitanaland.com').replace(/\/+$/, '');
const SCREEN_DIR = 'tests/e2e/screenshots';

// Known, pre-existing noise unrelated to this smoke test's purpose (matches
// the pattern already established in tests/e2e/orb-preview.mjs).
const NOISE = /rum\/beacon|notif-tap|favicon|the server responded with a status of (400|401|404)/;

// Sane upper bound for the profile avatar's rendered box. h-24 (96px) + a
// 3px ring is ~102px — this is deliberately generous (150px) so it only
// fires on a real regression, not a few px of intentional design change.
const MAX_AVATAR_PX = 150;

fs.mkdirSync(SCREEN_DIR, { recursive: true });

async function getSession() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('AUTH FAILED: ' + JSON.stringify(j).slice(0, 300));
  return j;
}

const failures = [];
const session = await getSession();
console.log(`[auth] OK — user ${session.user?.id} (${EMAIL})`);

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 14'] });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

await page.goto(`${BASE}/`);
await page.evaluate((s) => {
  try {
    const ref = (s.access_token && s.user) ? 'inmkhvwdcuyhnxkgfvsb' : '';
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  } catch (e) { /* localStorage may be unavailable pre-consent; non-fatal */ }
}, session);
await page.reload();
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

const menuButton = page.locator('[data-testid="mobile-nav-menu-button"]');
try {
  await menuButton.waitFor({ state: 'visible', timeout: 15000 });
} catch {
  failures.push('mobile nav menu button never became visible — app may have failed to render at all');
}

if (failures.length === 0) {
  await menuButton.click();
  const drawer = page.locator('[data-testid="mobile-nav-drawer"]');
  try {
    await drawer.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    failures.push('sidebar drawer did not open after clicking the menu button');
  }

  if (failures.length === 0) {
    await page.waitForTimeout(400); // let the spring animation settle before measuring
    await page.screenshot({ path: `${SCREEN_DIR}/mobile-shell-smoke-drawer.png` });

    const viewport = page.viewportSize();
    const drawerBox = await drawer.boundingBox();
    if (!drawerBox) {
      failures.push('drawer has no bounding box (not actually rendered/visible)');
    } else if (viewport && drawerBox.x + drawerBox.width > viewport.width + 1) {
      failures.push(
        `drawer overflows the viewport horizontally: x=${drawerBox.x} width=${drawerBox.width} viewport=${viewport.width}`
      );
    }

    const avatarBox = await page.locator('[data-testid="mobile-nav-avatar"]').boundingBox();
    if (!avatarBox) {
      failures.push('profile avatar has no bounding box inside the open drawer');
    } else if (avatarBox.width > MAX_AVATAR_PX || avatarBox.height > MAX_AVATAR_PX) {
      failures.push(
        `profile avatar rendered oversized: ${avatarBox.width}x${avatarBox.height}px (limit ${MAX_AVATAR_PX}px) — exactly the regression class this test exists to catch`
      );
    }
  }
} else {
  await page.screenshot({ path: `${SCREEN_DIR}/mobile-shell-smoke-failure.png` }).catch(() => {});
}

const realErrors = consoleErrors.filter((e) => !NOISE.test(e));
if (realErrors.length > 0) {
  failures.push(`${realErrors.length} console error(s) during the flow:\n  ` + realErrors.slice(0, 10).join('\n  '));
}

await browser.close();

if (failures.length > 0) {
  console.error('[mobile-shell-smoke] FAILED:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('[mobile-shell-smoke] PASSED — menu opens, drawer fits the viewport, avatar is sane, no console errors.');
