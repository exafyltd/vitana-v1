// VTID-05440 (wallet-fx-rate-url/fx-url) — the wallet's live EUR/USD rate loads
// from api.frankfurter.dev. Read-only staging check.
//
// api.frankfurter.app answers with a 301 to api.frankfurter.dev and no
// Access-Control-Allow-Origin header, so the browser blocked the wallet's FX
// request (STAGING-VERIFY run 41300076673, /wallet). This spec signs in as the
// documented test user (REST sign-in, then about:blank so the sign-in page's
// own requests are not judged), opens /wallet at 1440×900 and at 390×844,
// waits for the api.frankfurter.dev response and asserts it is 200, and
// asserts that no console error, page error or failed request mentions
// frankfurter or CORS. './staging-guard' (copied in by the runner) aborts every
// non-GET to the gateway and Supabase; nothing is clicked.
import { test, expect } from './staging-guard';

// Read-only lookups the signed-in app sends as POST (Supabase RPCs, the ORB
// prewarm, RUM/analytics beacons); the guard aborts them, so nothing is
// written. Same allow-list shape as vtid-05288-colours-batch-4.staging.spec.ts.
test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log|daily_matches)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches)))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const FX_HOST = /^https:\/\/api\.frankfurter\.dev\/v1\/latest\?/;
const FX_ERROR = /frankfurter|CORS/i;

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
  await page.goto('about:blank');
}

for (const [label, width, height] of [['1440', 1440, 900], ['390', 390, 844]] as const) {
  test(`wallet-fx-rate: /wallet loads the live EUR/USD rate from api.frankfurter.dev at ${label}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height });
    await signIn(page, request);
    const fxErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' && FX_ERROR.test(m.text())) fxErrors.push(m.text()); });
    page.on('pageerror', (e) => { if (FX_ERROR.test(String(e))) fxErrors.push(String(e)); });
    page.on('requestfailed', (r) => { if (/frankfurter/i.test(r.url())) fxErrors.push(`${r.url()} ${r.failure()?.errorText ?? ''}`); });
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const fx = page.waitForResponse((r) => FX_HOST.test(r.url()), { timeout: 30_000 });
    await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    const res = await fx;
    expect(res.status(), `FX response from ${res.url()}`).toBe(200);
    const body = await res.json();
    expect(typeof body?.rates?.EUR, 'rates.EUR in the FX response').toBe('number');
    await expect(page.getByTestId('delayed-loader')).toHaveCount(0, { timeout: 15_000 });
    expect(fxErrors, `FX errors on /wallet: ${fxErrors.join(' | ')}`).toHaveLength(0);
  });
}
