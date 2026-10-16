// VTID-05117 — Spotlight Phase 7.5: public, auth, legal, commerce-portal and
// operator-placeholder screens on the Spotlight contract.
//
// Read-only: './staging-guard' aborts every write. Nothing is submitted and no
// sign-in, sign-up or OAuth button is ever clicked; the spec only navigates
// and reads the DOM. `?spotlight=1` is the browser-local preview override
// (localStorage), never a server write.
//
// 1. Public screens (no app shell), signed OUT: with ?spotlight=1, at 390 / 1280
//    / 1440 px and in LTR and RTL —
//      - from 1024 px up the screen is framed by ScreenFrame with its archetype
//        (phones never get Spotlight, so at 390 px there is no frame);
//      - no horizontal scroll;
//      - no page-level spinner once the screen has settled.
//    Auth hand-off screens (/logout, /oauth/complete, /oauth/consent, the
//    e-mail confirmation pages) are NOT opened here: visiting them signs out or
//    consumes auth state. Their frames are proven in
//    src/pages/vtid-05117-public-leftovers.test.tsx.
// 2. Member screens with the app shell, signed in as the staging test user:
//    the frame plus the unchanged sidebar.
// 3. Operator placeholders (/professional/*, /staff/*): the test user has no
//    professional/staff role, so the spec proves the role gate still holds
//    (no workspace frame, nothing rendered for the role) and skips the
//    role-only part with that reason.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const WIDTHS = [390, 1280, 1440];

// Public screens without the app shell → the archetype their ScreenFrame carries.
const PUBLIC: { path: string; archetype: string }[] = [
  { path: '/', archetype: 'form' },
  { path: '/maxina', archetype: 'form' },
  { path: '/alkalma', archetype: 'form' },
  { path: '/reset-password', archetype: 'form' },
  { path: '/privacy', archetype: 'form' },
  { path: '/terms', archetype: 'form' },
  { path: '/apply', archetype: 'form' },
  { path: '/commerce-login', archetype: 'form' },
  { path: '/maxina/app', archetype: 'form' },
  { path: '/exafy-admin', archetype: 'workspace' },
  { path: '/maxina_support', archetype: 'collection' },
  { path: '/download', archetype: 'collection' },
  { path: '/commerce', archetype: 'collection' },
  { path: '/commerce/join', archetype: 'collection' },
  { path: '/commerce/connect', archetype: 'collection' },
  { path: '/commerce/connect/privacy', archetype: 'collection' },
  // Cinematic intro: full-bleed `immersive` frame (keeps the measured Orb slot).
  { path: '/_intro/maxina', archetype: 'immersive' },
];

// Member screens rendered inside AppLayout / the commerce shell, signed in.
const MEMBER: { path: string; archetype: string; sidebar: boolean }[] = [
  { path: '/invite', archetype: 'form', sidebar: true },
  { path: '/packages/success', archetype: 'collection', sidebar: true },
  { path: '/universal-cart', archetype: 'collection', sidebar: false },
  { path: '/commerce/team', archetype: 'collection', sidebar: false },
  { path: '/commerce/health-orders', archetype: 'collection', sidebar: false },
];

const OPERATOR = ['/professional/schedule', '/professional/billing', '/staff/tasks', '/staff/time'];

async function stubOrb(page: import('@playwright/test').Page) {
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

/** Visible spinners outside buttons and outside decorative (aria-hidden) placeholders. */
async function pageSpinners(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('.animate-spin')].filter((el) => {
        if (el.closest('button, [aria-hidden="true"]')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length,
  );
}

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

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

for (const entry of PUBLIC) {
  test(`VTID-05117: ${entry.path} (${entry.archetype}, signed out) keeps the Spotlight contract at 390/1280/1440 px, LTR and RTL`, async ({ page }) => {
    test.setTimeout(120_000);
    await stubOrb(page);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${entry.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 20_000 });

      if (width >= 1024) {
        const frame = page.locator('[data-archetype]').first();
        await expect(frame, `${entry.path} @${width}px is framed`).toBeVisible({ timeout: 25_000 });
        await expect(frame).toHaveAttribute('data-archetype', entry.archetype);
      } else {
        // Phones never get Spotlight: today's layout, no frame.
        await page.waitForTimeout(1_500);
        await expect(page.locator('[data-archetype]')).toHaveCount(0);
      }

      await expect.poll(() => pageSpinners(page), { message: `${entry.path} @${width}px: page spinner after load`, timeout: 20_000 }).toBe(0);
      expect(await overflow(page), `${entry.path} @${width}px: horizontal scroll (LTR)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      await page.waitForTimeout(300);
      expect(await overflow(page), `${entry.path} @${width}px: horizontal scroll (RTL)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'ltr';
      });
    }
    await page.goto('/?spotlight=clear', { waitUntil: 'domcontentloaded' });
  });
}

test('VTID-05117: legal text is the same with Spotlight on and off', async ({ page }) => {
  test.setTimeout(90_000);
  await stubOrb(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/privacy?lang=de', '/terms?lang=en']) {
    await page.goto(`${path}&spotlight=0`, { waitUntil: 'domcontentloaded' });
    const off = await page.locator('article').first().innerText({ timeout: 25_000 });
    await page.goto(`${path}&spotlight=1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-archetype="form"]').first()).toBeVisible({ timeout: 25_000 });
    const on = await page.locator('article').first().innerText();
    expect(off.length).toBeGreaterThan(500);
    expect(on, `${path}: legal text changed`).toBe(off);
  }
  await page.goto('/?spotlight=clear', { waitUntil: 'domcontentloaded' });
});

test('VTID-05117: member screens keep their frame (and the sidebar where the app shell renders)', async ({ page, request }) => {
  test.setTimeout(240_000);
  await signIn(page, request);
  await stubOrb(page);
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const m of MEMBER) {
      await page.goto(`${m.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      const frame = page.locator('[data-archetype]').first();
      await expect(frame, `${m.path} @${width}px is framed`).toBeVisible({ timeout: 45_000 });
      await expect(frame).toHaveAttribute('data-archetype', m.archetype);
      if (m.sidebar) await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible();
      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 20_000 });
      await expect.poll(() => pageSpinners(page), { message: `${m.path}: page spinner after load`, timeout: 20_000 }).toBe(0);
      expect(await overflow(page), `${m.path} @${width}px: horizontal scroll (LTR)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      await page.waitForTimeout(300);
      expect(await overflow(page), `${m.path} @${width}px: horizontal scroll (RTL)`).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        document.documentElement.dir = 'ltr';
      });
    }
  }
  await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
});

test('VTID-05117: professional/staff placeholders render the workspace frame — or still gate a member without the role', async ({ page, request }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, request);
  await stubOrb(page);

  // Two gates exist for a member without the role: ProtectedRoute renders NotAuthorized in place, or — when
  // ProtectedRoute lets the account through (an Exafy admin passes every role check) but its dbRole is
  // community — useRoleRouteEnforcement redirects to /home. The role query retries before it settles (the
  // guard aborts get_role_preference), so the workspace frame can show for one render before that redirect:
  // only count it as "has the role" once it is still on the requested path after the retries.
  const settle = async (path: string): Promise<'frame' | 'gated'> => {
    const workspace = page.locator('[data-archetype="workspace"]');
    const denied = page.locator('main a[href="/"]');
    const onPath = () => new URL(page.url()).pathname.startsWith(path);
    const state = async () =>
      !onPath() || (await denied.count()) > 0 ? 'gated' : (await workspace.count()) > 0 ? 'frame?' : 'pending';
    await expect.poll(state, { timeout: 45_000, intervals: [500] }).not.toBe('pending');
    if ((await state()) === 'gated') return 'gated';
    await page.waitForTimeout(10_000); // past React Query's default retry backoff
    return (await state()) === 'frame?' ? 'frame' : 'gated';
  };

  await page.goto(`${OPERATOR[0]}?spotlight=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-sidebar="sidebar"]').first()).toBeVisible({ timeout: 45_000 });
  const hasRole = (await settle(OPERATOR[0])) === 'frame';

  if (!hasRole) {
    for (const path of OPERATOR) {
      await page.goto(`${path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
      expect(await settle(path), `${path} must stay gated for a member without the role`).toBe('gated');
      const landed = new URL(page.url()).pathname;
      expect(landed === path || landed === '/home', `${path}: NotAuthorized in place or redirected to /home (landed on ${landed})`).toBe(true);
      // NotAuthorized in place is a legacy, unframed page: no Spotlight frame at all. Only after the
      // redirect does a frame belong there (the /home focus-feed), and it must not be the workspace one.
      await expect(page.locator(landed === '/home' ? '[data-archetype="workspace"]' : '[data-archetype]')).toHaveCount(0);
    }
    await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
    test.skip(true, 'The staging test user has no professional/staff role: the role gate is verified; the workspace frame itself is covered by src/pages/vtid-05117-public-leftovers.test.tsx');
    return;
  }

  for (const path of OPERATOR) {
    await page.goto(`${path}?spotlight=1`, { waitUntil: 'domcontentloaded' });
    expect(await settle(path), `${path} workspace frame`).toBe('frame');
    await expect(page.locator('[data-archetype="workspace"] [data-spotlight-layout]').first()).toHaveAttribute('data-width', 'full');
    expect(await overflow(page), `${path}: horizontal scroll`).toBeLessThanOrEqual(1);
  }
  await page.goto('/home?spotlight=clear', { waitUntil: 'domcontentloaded' });
});
