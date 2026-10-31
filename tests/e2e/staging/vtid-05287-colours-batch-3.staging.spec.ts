// VTID-PENDING (desktop-spotlight-finish/colours-batch-3) — raw palette → tokens
// for the community, sharing, live rooms, events/meetups, event game, feed and
// home screens (owner decision 1, option A). Read-only staging check, same shape
// as the other colour batches.
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Nothing is clicked. For this batch's
// member-reachable spec routes (/comm, /comm/groups, /comm/live-rooms,
// /comm/events-meetups, /sharing, /sharing/campaigns, /sharing/data-consent) at
// 1440×900 (?spotlight=1) and 390×844 it asserts:
//   - the route renders its app shell / content without a runtime console error;
//   - no horizontal scroll (SR-19), also with dir="rtl";
//   - no raw Tailwind palette class leaks into the rendered DOM (the colour
//     mapping shipped), checked structurally on the live page.
// Every route in this batch is community-member reachable, so no surface is
// role-gated here. On-media scrims (black overlays on photos/video) keep their
// literals with a reason and are not Tailwind palette scale classes, so the
// structural check below does not flag them.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/[a-z-]+)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

// Member-reachable routes this batch recoloured: the Community hub and groups,
// the Live Rooms list, the Events & Meetups hub, and the Sharing screens.
const ROUTES = [
  '/comm',
  '/comm/groups',
  '/comm/live-rooms',
  '/comm/events-meetups',
  '/sharing',
  '/sharing/campaigns',
  '/sharing/data-consent',
];

// A raw Tailwind palette class on a live element would mean the mapping did not
// ship — checked inside the page with the design rule's own palette families.
const RAW_PALETTE_SRC =
  '(?:^|\\s)(?:bg|text|border|ring|from|via|to|fill|stroke|divide|shadow|outline|decoration|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}(?:/\\d+)?(?:\\s|$)';

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

for (const route of ROUTES) {
  for (const width of [1440, 390]) {
    const spotlight = width >= 1024 ? '?spotlight=1' : '';
    test(`VTID-PENDING colours-batch-3: ${route} renders recoloured at ${width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await signIn(page, request);
      await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await page.goto(`${route}${spotlight}`, { waitUntil: 'domcontentloaded' });

      // The page mounted its own content (not an error boundary / blank).
      // A runtime-injected theme bootstrap <script> can be #root's first child
      // (hidden); assert on the first real rendered element instead.
      await expect(page.locator('#root *:not(script):not(style)').first()).toBeVisible({ timeout: 25_000 });
      await page.waitForTimeout(600);

      // No raw palette class on any rendered element: the mapping shipped.
      const rawClasses = await page.evaluate(() =>
        [...document.querySelectorAll('[class]')].map((el) => el.getAttribute('class') ?? ''),
      );
      const rawRe = new RegExp(RAW_PALETTE_SRC);
      const leaked = rawClasses.find((c) => rawRe.test(c));
      expect(leaked, `raw palette class on ${route}: ${leaked}`).toBeFalsy();

      // No runtime error while rendering the recoloured screen.
      expect(errors, `console errors on ${route}`).toEqual([]);

      // No horizontal scroll in either direction (SR-19).
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(await overflow(), `horizontal scroll (LTR) on ${route}`).toBeLessThanOrEqual(1);
      await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
      await page.waitForTimeout(250);
      expect(await overflow(), `horizontal scroll (RTL) on ${route}`).toBeLessThanOrEqual(1);
    });
  }
}
