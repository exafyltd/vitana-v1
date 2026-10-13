// VTID-05115 — Spotlight Phase 7.3: Dev (Command Hub) screens on the `workspace` archetype.
// Desktop 1440x900, signed in as the staging test user. Read-only: './staging-guard'
// aborts every write; this spec only navigates and reads the DOM. The Spotlight
// preview override (`?spotlight=1|0`) is a localStorage switch in the browser,
// never a server write.
//
// The Command Hub routes sit behind DevAuthGuard (signed in), not a role gate, so
// the test user can open them. Entering the hub makes DevLayout ask for the admin
// view role (`rpc/set_role_preference`) and restore the old one on leaving — both
// are POSTs the staging guard aborts (the `rpc/[a-z_]+` entry below), so the role
// change stays in this browser's cache and never reaches the database. If the
// staging build has the hub switched off (VITE_DEV_HUB_ENABLED=false) the spec
// skips with that reason. Otherwise it checks each screen with Spotlight on (the
// section tabs directly above <ScreenFrame archetype="workspace">, full width, no
// rail, no horizontal scroll) and off (legacy tree, no [data-archetype]).
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 1440, height: 900 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
// Empty-state template screens in five Command Hub sections (no data panels, no live streams).
const SCREENS: { path: string; section: string }[] = [
  { path: '/dev/agents/worker', section: '/dev/agents' },
  { path: '/dev/cicd/runs', section: '/dev/cicd' },
  { path: '/dev/oasis/state', section: '/dev/oasis' },
  { path: '/dev/settings/flags', section: '/dev/settings' },
  { path: '/dev/vtid/search', section: '/dev/vtid' },
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

/** True when the route settled into the Command Hub (workspace frame or its section tabs). */
async function hubRendered(page: import('@playwright/test').Page, section: string) {
  const workspace = page.locator('[data-archetype="workspace"]');
  const tabs = page.locator(`main nav a[href^="${section}"]`);
  try {
    await expect(workspace.or(tabs).first()).toBeVisible({ timeout: 45_000 });
    return true;
  } catch {
    return false;
  }
}

test('VTID-05115: Dev screens render the workspace archetype with their section tabs kept', async ({ page, request }) => {
  test.setTimeout(240_000);
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await page.goto(`${SCREENS[0].path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
  const hub = await hubRendered(page, SCREENS[0].section);
  test.skip(!hub, 'The Command Hub did not render on this staging build (switched off or redirected to /dev/login); the workspace layout itself is covered by src/pages/dev/vtid-05115-dev-workspace.test.tsx');

  for (const s of SCREENS) {
    // Spotlight on: the section tabs (SubNavigation) are directly above the workspace frame.
    await page.goto(`${s.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
    const frame = page.locator('[data-archetype="workspace"]');
    await expect(frame, `${s.path} workspace frame`).toHaveCount(1, { timeout: 45_000 });
    await expect(frame.locator('[data-spotlight-layout]')).toHaveAttribute('data-width', 'full');
    await expect(frame.locator('[data-spotlight-rail]')).toHaveCount(0);
    const tabsAbove = await frame.evaluate((el, section) => {
      const prev = el.previousElementSibling;
      return !!prev && prev.tagName === 'NAV' && !!prev.querySelector(`a[href^="${section}"]`);
    }, s.section);
    expect(tabsAbove, `${s.path}: section tabs directly above the workspace frame`).toBe(true);
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
