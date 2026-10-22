// desktop-spotlight-finish / colours-backoffice — the three BackOffice command
// dialogs (ApprovalDecisionDialog, DraftCommandDialog, PolicyEditDialog) had six
// raw palette classes mapped to the nearest existing status tokens
// (status-success / status-warning). The dialogs render only for a BackOffice
// member, so this staging spec verifies, read-only, that the BackOffice role
// gate still holds for the community test account — every BackOffice route
// renders NotAuthorized in place, no workspace frame, no BackOffice section
// tabs. The dialogs' colour mapping itself is covered by the Vitest render
// tests `src/components/backoffice/*.colours.test.tsx`.
//
// Desktop 1440x900, signed in as the staging test user. Read-only:
// './staging-guard' aborts every write; this spec only navigates and reads the
// DOM. The Spotlight preview override (`?spotlight=1`) is a localStorage switch
// in the browser, never a server write. Never runs against vitanaland.com.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
// The routes that mount the three dialogs this lane recoloured: approvals
// (ApprovalDecisionDialog, DraftCommandDialog) and settings (PolicyEditDialog).
const SCREENS: { path: string; section: string }[] = [
  { path: '/backoffice/approvals', section: '/backoffice/approvals' },
  { path: '/backoffice/sales/leads', section: '/backoffice/sales/' },
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

test('VTID-PENDING colours-backoffice: BackOffice dialog routes still gate the community account; dialog colours covered by Vitest', async ({ page, request }) => {
  test.setTimeout(240_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto(`${SCREENS[0].path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible({ timeout: 45_000 });
  const isMember = await settle(page);

  if (!isMember) {
    for (const s of SCREENS) {
      await page.goto(`${s.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      expect(await settle(page), `${s.path} must stay gated for a non-member`).toBe(false);
      await expect(page).toHaveURL(new RegExp(`${s.path.replace(/\//g, '\\/')}(\\?|$)`));
      await expect(page.locator('[data-archetype]')).toHaveCount(0);
      await expect(page.locator(`main nav a[href^="${s.section}"]`)).toHaveCount(0);
    }
    test.skip(true, 'The staging test user has no BackOffice role: gating verified; the recoloured dialogs are covered by src/components/backoffice/*.colours.test.tsx');
    return;
  }

  // When the account does hold the role, the dialog host routes render the
  // workspace frame; the dialogs themselves open only on a user action, which a
  // read-only spec does not perform (their colours are covered by Vitest).
  for (const s of SCREENS) {
    await page.goto(`${s.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
    expect(await settle(page), `${s.path} workspace frame`).toBe(true);
    await expect(page.locator('[data-archetype="workspace"]')).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${s.path}: horizontal scroll`).toBeLessThanOrEqual(1);
  }
  await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
});
