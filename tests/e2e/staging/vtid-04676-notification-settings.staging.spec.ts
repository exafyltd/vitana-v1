// VTID-04675 / VTID-04676 — notification settings on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - the deployed bundle carries the rebuilt Admin › Notifications screen;
//   - the gateway lists only member categories that hold a switched-on type
//     ("Posts & reactions" and "Tips & updates" are there, "Live Rooms" is
//     not — every live-room type starts switched off);
//   - Settings › Notifications shows those categories and keeps their
//     switches usable while push is off. No switch is clicked.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('notification settings match what is really sent', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  // German is the eagerly bundled catalog, so the new admin screen's strings are in the entry chunk.
  expect(bundle, 'the rebuilt Admin › Notifications screen is not in this build').toContain(
    'Schalte jede Benachrichtigung einzeln ein oder aus',
  );

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

  const res = await request.get(`${GATEWAY}/api/v1/notifications/category-preferences?locale=de`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const all = [...(body.data.chat ?? []), ...(body.data.calendar ?? []), ...(body.data.community ?? [])];
  const slugs = all.map((c: { slug: string }) => c.slug);
  expect(slugs).toContain('posts_reactions');
  expect(slugs).toContain('tips_updates');
  expect(slugs).not.toContain('live_rooms');
  for (const c of all) expect(c.types?.length ?? 0, `${c.slug} has no switched-on type`).toBeGreaterThan(0);

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/settings/notifications', { waitUntil: 'domcontentloaded' });
  const posts = page.getByTestId('member-category-posts_reactions');
  await expect(posts).toBeVisible({ timeout: 20_000 });
  await expect(posts.getByRole('switch')).toBeEnabled();
  await expect(page.getByTestId('member-category-live_rooms')).toHaveCount(0);
});
