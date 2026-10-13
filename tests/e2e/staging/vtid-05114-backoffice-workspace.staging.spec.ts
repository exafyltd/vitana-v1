// VTID-05114 — Spotlight Phase 7.2: BackOffice screens on the `workspace` archetype.
// Desktop 1440x900, signed in as the staging test user. Read-only: './staging-guard'
// aborts every write; this spec only navigates and reads the DOM. The Spotlight
// preview override (`?spotlight=1|0`) is a localStorage switch in the browser,
// never a server write.
//
// The test user is normally NOT a BackOffice member. Then the spec proves the
// BackOffice routes still gate exactly as before (ProtectedRoute
// requiredRole="backoffice" renders NotAuthorized in place: no BackOffice
// section tabs, no workspace frame, no BackOffice content) and skips the
// BackOffice-only assertions with that reason. When the account does hold the
// role, it checks each screen with Spotlight on (BackOfficeTabs directly above
// <ScreenFrame archetype="workspace">, no horizontal scroll) and off (legacy
// tree, no [data-archetype]).
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
// One screen per main BackOffice section (overview, sales, accounting, audit, settings).
const SCREENS: { path: string; section: string }[] = [
  { path: '/backoffice/dashboard', section: '/backoffice/' },
  { path: '/backoffice/sales/leads', section: '/backoffice/sales/' },
  { path: '/backoffice/accounting/journals', section: '/backoffice/accounting/' },
  { path: '/backoffice/audit/trail', section: '/backoffice/audit/' },
  { path: '/backoffice/settings/access', section: '/backoffice/settings/' },
];

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

/** Waits until the route has settled into either the BackOffice workspace or the not-authorized page. */
async function settle(page: import('@playwright/test').Page) {
  const workspace = page.locator('[data-archetype="workspace"]');
  const denied = page.locator('main a[href="/"]');
  await expect(workspace.or(denied).first()).toBeVisible({ timeout: 45_000 });
  return (await workspace.count()) > 0;
}

test('VTID-05114: BackOffice screens render the workspace archetype with BackOfficeTabs kept — or still gate a non-member', async ({ page, request }) => {
  test.setTimeout(240_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto(`${SCREENS[0].path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible({ timeout: 45_000 });
  const isMember = await settle(page);

  if (!isMember) {
    // Gate unchanged: every BackOffice route renders NotAuthorized in place for this account.
    for (const s of SCREENS) {
      await page.goto(`${s.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      expect(await settle(page), `${s.path} must stay gated for a non-member`).toBe(false);
      await expect(page).toHaveURL(new RegExp(`${s.path.replace(/\//g, '\\/')}(\\?|$)`));
      await expect(page.locator('[data-archetype]')).toHaveCount(0);
      await expect(page.locator(`main nav a[href^="${s.section}"]`)).toHaveCount(0);
    }
    test.skip(true, 'The staging test user has no BackOffice role: BackOffice gating verified; the workspace layout itself is covered by src/pages/backoffice/vtid-05114-backoffice-workspace.test.tsx');
    return;
  }

  for (const s of SCREENS) {
    // Spotlight on: BackOfficeTabs is the section tab bar directly above the workspace frame.
    await page.goto(`${s.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
    expect(await settle(page), `${s.path} workspace frame`).toBe(true);
    const frame = page.locator('[data-archetype="workspace"]');
    await expect(frame).toHaveCount(1);
    await expect(frame.locator('[data-spotlight-layout]')).toHaveAttribute('data-width', 'full');
    const tabsAbove = await frame.evaluate((el, section) => {
      const prev = el.previousElementSibling;
      return !!prev && prev.tagName === 'NAV' && !!prev.querySelector(`a[href^="${section}"]`);
    }, s.section);
    expect(tabsAbove, `${s.path}: BackOfficeTabs directly above the workspace frame`).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${s.path}: horizontal scroll`).toBeLessThanOrEqual(1);

    // Spotlight off: today's tree, no archetype frame, tabs still there.
    await page.goto(`${s.path}?spotlight=0`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`main nav a[href^="${s.section}"]`).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-archetype]')).toHaveCount(0);
  }
  // Leave the browser's preview override cleared.
  await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
});
