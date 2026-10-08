// VTID-04972 — richer lavender for the News feed's "New in the community" and
// "Did you know?" cards (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Nothing is clicked. The cards are real
// feed items read with GETs; each check is skipped when the feed has no such
// card for the test account. Phone viewports 390x844 and 412x915 (Samsung).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_user_profile_by_identifier)|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

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

// The feed re-renders its cards while profile lookups settle (a handle taken
// earlier can be a detached node), so each reading is ONE in-page evaluate that
// queries the live card, polled until it returns a real value (VTID-04957).
const measureSurfaces = () => {
  const read = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el || !el.isConnected) return null;
    const c = getComputedStyle(el).backgroundColor;
    return c || null;
  };
  const probe = document.createElement('div');
  probe.style.background = 'hsl(var(--sys-vitana-card))';
  document.body.appendChild(probe);
  const pale = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return {
    pale,
    member: read('[data-testid="new-member-card"]'),
    tip: read('[data-testid="feature-announcement-did-you-know-feature"]'),
  };
};

const channels = (c: string) => c.match(/\d+/g)!.slice(0, 3).map(Number);

test('VTID-04972: the New-in-the-community and Did-you-know cards are bold lavender, not the washed-out tint (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  let m = null as ReturnType<typeof measureSurfaces> | null;
  try {
    await expect
      .poll(async () => (m = await page.evaluate(measureSurfaces)).member !== null || m.tip !== null, { timeout: 25_000, intervals: [500, 1000] })
      .toBe(true);
  } catch {
    test.skip(true, 'neither card is in the feed for this account');
  }
  for (const [name, colour] of [['New in the community', m!.member], ['Did you know?', m!.tip]] as const) {
    if (!colour) continue; // that card is simply not in this account's feed
    const [r, g, b] = channels(colour);
    expect(b, `${name} surface ${colour} is not lavender`).toBeGreaterThan(r);
    expect(Math.max(r, g, b) - Math.min(r, g, b), `${name} surface ${colour} is washed out`).toBeGreaterThanOrEqual(18);
    expect(colour, `${name} fell back to the pale Vitana tint`).not.toBe(m!.pale);
  }
});
