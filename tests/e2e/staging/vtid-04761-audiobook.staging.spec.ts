// VTID-04760..04763 — the Audiobook on staging (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The writes the app itself attempts while
// a member looks around — the analytics beacon, the RUM beacon, presence, and
// the one-time guided-mode stamp on My Journey — are declared below and stay
// aborted: nothing is written. No episode is played to its end (that would
// record a listen), the reminder control is read and never changed.
//
// Checks:
//   - the deployed bundle names the guided journey Hörbuch (Phase 1);
//   - the voice registry knows "Hörbuch" (Phase 1);
//   - the staging gateway serves a real episode as audio/mpeg (Phase 2);
//   - desktop My Journey shows the episodes and the daily reminder (Phases 1, 4);
//   - an episode's Play opens the mini player and fetches its audio (Phase 2);
//   - the push deep link /autopilot/audiobook starts the player and settles
//     on /autopilot (Phase 4).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|journey\/mode)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

test('the Audiobook: naming, audio, episodes, player and deep link', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  test.setTimeout(120_000);

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  // German is the eagerly bundled catalog.
  expect(bundle, 'the Audiobook naming is not in this build').toContain('Dein Longevity-Hörbuch');

  const registry = await (await request.get('/nav-registry.json')).text();
  expect(registry, 'voice navigation does not know the Audiobook').toContain('hoerbuch');

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
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      headers: { apikey: key!, 'Content-Type': 'application/json' },
      data: { email, password },
    })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();

  // A real episode, rendered by Polly on the staging gateway.
  const audio = await request.get(`${GATEWAY}/api/v1/journey/audiobook/topics/T251/audio?lang=de`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  expect(audio.status(), 'episode audio not served').toBe(200);
  expect(audio.headers()['content-type']).toBe('audio/mpeg');
  expect((await audio.body()).length).toBeGreaterThan(10_000);

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/autopilot', { waitUntil: 'domcontentloaded' });

  const section = page.getByTestId('desktop-audiobook');
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('audiobook-reminder-select')).toBeVisible();
  const playEpisode = page.getByTestId('audiobook-play-episode').first();
  await expect(playEpisode).toBeVisible({ timeout: 30_000 });

  const audioResponse = page.waitForResponse((r) => r.url().includes('/api/v1/journey/audiobook/topics/') && r.request().method() === 'GET', { timeout: 60_000 });
  await playEpisode.click();
  const player = page.getByTestId('audiobook-mini-player');
  await expect(player).toBeVisible({ timeout: 20_000 });
  const res = await audioResponse;
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('audio/mpeg');
  await expect(page.getByTestId('audiobook-track-title')).not.toBeEmpty();
  await page.getByTestId('audiobook-close').click();
  await expect(player).toHaveCount(0);

  // Push deep link: plain path, starts the player, settles on /autopilot.
  await page.goto('/autopilot/audiobook', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/autopilot$/, { timeout: 30_000 });
  await expect(page.getByTestId('audiobook-mini-player')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('audiobook-close').click();
});
