// VTID-05100 — Vitana Companion Messages Phase 2 frontend on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Checks:
//   - the deployed bundle carries the "Nachrichten von Vitana" settings section
//     and the "Mit Vitana sprechen" header button (German is the eagerly
//     bundled catalog);
//   - the gateway answers the signed-in member's own companion preferences
//     (GET only — the PATCH a switch would send is never made here);
//   - Settings › Notifications shows the section with its switches enabled.
//     No switch is clicked: staging writes to the production database.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('Vitana messages settings read the member’s own preferences', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  expect(bundle, 'the Vitana messages settings section is not in this build').toContain('Nachrichten von Vitana');
  expect(bundle, 'the Talk to Vitana header button is not in this build').toContain('Mit Vitana sprechen');

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

  const res = await request.get(`${GATEWAY}/api/v1/companion/preferences`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  const body = await res.json();
  expect(body.ok).toBe(true);
  for (const f of ['enabled', 'topic_health', 'topic_community', 'topic_business']) {
    expect(typeof body.preferences?.[f], `preferences.${f}`).toBe('boolean');
  }

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/settings/notifications', { waitUntil: 'domcontentloaded' });
  const section = page.getByTestId('vitana-messages-settings');
  await expect(section).toBeVisible({ timeout: 20_000 });
  const enabled = page.getByTestId('vitana-messages-enabled');
  await expect(enabled).toBeEnabled();
  await expect(enabled).toHaveAttribute('aria-checked', body.preferences.enabled ? 'true' : 'false');
});
