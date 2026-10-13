// VTID-05107 — Spotlight Design Contract, staging design-lint
// (docs/design-system/SPOTLIGHT_RULES.md §C). Read-only: './staging-guard'
// aborts every write; nothing is clicked.
//
// For every screen marked `status: "migrated"` in src/design/screen-manifest.json
// (static routes; parameterised routes are covered by their phase's own spec),
// with Spotlight forced on (?spotlight=1) at 1024 / 1440 / 1920 px:
//   - the Vitanaland sidebar chrome is present (SR-01): shortcut bar, global
//     search, nav items, footer controls;
//   - the screen is framed by ScreenFrame with the manifest's archetype (SR-03);
//   - focus-feed / storefront / detail / dashboard show exactly ONE
//     [data-vcard-size="spotlight"] in the first viewport (SR-06/07);
//   - no horizontal scroll, also with dir="rtl" (SR-19);
//   - the full-screen DelayedLoader is gone once the screen settled (SR-20).
// While no screen is migrated yet (Phases 1a–1c) only the manifest check runs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

interface Entry { path: string; archetype: string; status: string; tier: string }
const SINGLE = new Set(['focus-feed', 'storefront', 'detail', 'dashboard']);
const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

function loadManifest(): Entry[] {
  // ESM spec (package "type": "module"): no __dirname — resolve from cwd, else from this file's URL.
  const candidates = [
    path.resolve(process.cwd(), 'src/design/screen-manifest.json'),
    fileURLToPath(new URL('../../../src/design/screen-manifest.json', import.meta.url)),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('src/design/screen-manifest.json not found');
  return JSON.parse(fs.readFileSync(file, 'utf8')).screens as Entry[];
}

const manifest = loadManifest();
// Operator surfaces (admin, backoffice, dev, professional, staff) are role-gated:
// the community test account cannot open them, so their own phase specs verify
// them (e.g. vtid-05113-admin-workspace, which checks the gate for a non-admin).
const OPERATOR = /^\/(admin|backoffice|dev|professional|staff)(\/|$)/;
const migrated = manifest.filter(
  (e) => e.status === 'migrated' && !e.path.includes(':') && !e.path.includes('*') && !OPERATOR.test(e.path),
);

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

test('VTID-05107: the screen manifest is readable and every entry has an archetype and status', () => {
  expect(manifest.length).toBeGreaterThan(300);
  for (const e of manifest) {
    expect(e.archetype, e.path).toBeTruthy();
    expect(['legacy', 'migrated'], e.path).toContain(e.status);
  }
});

for (const entry of migrated) {
  for (const width of [1024, 1440, 1920]) {
    test(`VTID-05107: ${entry.path} (${entry.archetype}) keeps the Spotlight contract at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await page.goto(`${entry.path}?spotlight=1`, { waitUntil: 'domcontentloaded' });

      const frame = page.locator('[data-archetype]').first();
      await expect(frame).toBeVisible({ timeout: 25_000 });
      await expect(frame).toHaveAttribute('data-archetype', entry.archetype);

      const sidebar = page.locator('[data-sidebar="sidebar"]').first();
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('[data-sidebar="header"] input').first()).toBeVisible();
      expect(await sidebar.locator('[data-sidebar="content"] a[href]').count()).toBeGreaterThanOrEqual(10);
      await expect(sidebar.locator('[data-sidebar="footer"]')).toBeVisible();

      await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });

      if (SINGLE.has(entry.archetype)) {
        await expect(page.locator('[data-vcard-size="spotlight"]').first()).toBeVisible({ timeout: 20_000 });
        const inFirstViewport = await page.evaluate(() =>
          [...document.querySelectorAll('[data-vcard-size="spotlight"]')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.top < innerHeight && r.bottom > 0;
          }).length,
        );
        expect(inFirstViewport, 'exactly one spotlight card in the first viewport').toBe(1);
      }

      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(await overflow(), 'horizontal scroll (LTR)').toBeLessThanOrEqual(1);
      await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
      await page.waitForTimeout(300);
      expect(await overflow(), 'horizontal scroll (RTL)').toBeLessThanOrEqual(1);
    });
  }
}
