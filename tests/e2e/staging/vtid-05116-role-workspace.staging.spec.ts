// VTID-05116 — Spotlight Phase 7.4: Professional + Staff screens on the `workspace` archetype.
// Desktop 1440x900, signed in as the staging test user. Read-only: './staging-guard'
// aborts every write; this spec only navigates and reads the DOM. The Spotlight
// preview override (`?spotlight=1|0`) is a localStorage switch in the browser,
// never a server write.
//
// The test user is normally neither a professional nor staff. Then the spec proves
// the role routes still gate exactly as before (ProtectedRoute renders
// NotAuthorized in place: no workspace frame, no role content) and skips the
// role-only assertions with that reason. When the account does hold the roles, it
// checks each screen with Spotlight on (<ScreenFrame archetype="workspace">, full
// width, no rail, no horizontal scroll) and off (legacy tree, no [data-archetype]).
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
// The three role screens with their own page (the other role routes are ComingSoonPlaceholder).
const SCREENS = ['/professional/dashboard', '/staff/dashboard', '/staff/queue'];

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

/** Waits until the route has settled into either the workspace frame or the not-authorized page. */
async function settle(page: import('@playwright/test').Page) {
  const workspace = page.locator('[data-archetype="workspace"]');
  const denied = page.locator('main a[href="/"]');
  await expect(workspace.or(denied).first()).toBeVisible({ timeout: 45_000 });
  return (await workspace.count()) > 0;
}

test('VTID-05116: Professional + Staff screens render the workspace archetype — or still gate a member without the role', async ({ page, request }) => {
  test.setTimeout(180_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto(`${SCREENS[0]}?spotlight=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible({ timeout: 45_000 });
  const hasRole = await settle(page);

  if (!hasRole) {
    // Gate unchanged: every role route renders NotAuthorized in place for this account.
    for (const p of SCREENS) {
      await page.goto(`${p}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      expect(await settle(page), `${p} must stay gated for a member without the role`).toBe(false);
      await expect(page).toHaveURL(new RegExp(`${p.replace(/\//g, '\\/')}(\\?|$)`));
      await expect(page.locator('[data-archetype]')).toHaveCount(0);
    }
    test.skip(true, 'The staging test user has neither the professional nor the staff role: gating verified; the workspace layout itself is covered by src/pages/staff/vtid-05116-role-workspace.test.tsx');
    return;
  }

  for (const p of SCREENS) {
    // Spotlight on: the page body is inside the workspace frame.
    await page.goto(`${p}?spotlight=1`, { waitUntil: 'domcontentloaded' });
    expect(await settle(page), `${p} workspace frame`).toBe(true);
    const frame = page.locator('[data-archetype="workspace"]');
    await expect(frame).toHaveCount(1);
    await expect(frame.locator('[data-spotlight-layout]')).toHaveAttribute('data-width', 'full');
    await expect(frame.locator('[data-spotlight-rail]')).toHaveCount(0);
    await expect(frame.locator('[data-spotlight-stage] h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${p}: horizontal scroll`).toBeLessThanOrEqual(1);

    // Spotlight off: today's tree, no archetype frame, same heading.
    await page.goto(`${p}?spotlight=0`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-archetype]')).toHaveCount(0);
  }
  // Leave the browser's preview override cleared.
  await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
});
