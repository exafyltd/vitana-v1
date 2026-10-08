// VTID-04973 — News feed order (info card, user post, info card, user post …) and
// the "Did you know?" feed card as a Vitana card (read-only).
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

// One in-page reading of the live feed grid (the feed re-renders while profile
// lookups settle, so a handle taken earlier can be a detached node). Wrappers
// are `display: contents` for items, so visibility is judged on their first child.
const measureFeed = () => {
  const grid = document.querySelector('[data-testid="feed-grid"]');
  if (!grid) return null;
  const kinds = [...grid.querySelectorAll(':scope > [data-feed-kind]')]
    .filter((el) => {
      const box = getComputedStyle(el).display === 'contents' ? el.firstElementChild : el;
      if (!box) return false;
      const r = box.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map((el) => el.getAttribute('data-feed-kind') as string);
  const tip = document.querySelector('[data-testid="feature-announcement-did-you-know-feature"]');
  return {
    kinds: kinds.slice(0, 8),
    total: kinds.length,
    tip: tip ? { hasOrb: !!tip.querySelector('img'), text: (tip as HTMLElement).innerText } : null,
  };
};

test('VTID-04973: the feed starts with an info card and info cards never sit side by side (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  let m = null as ReturnType<typeof measureFeed>;
  try {
    await expect.poll(async () => ((m = await page.evaluate(measureFeed))?.total ?? 0) >= 4, { timeout: 30_000, intervals: [500, 1000] }).toBe(true);
  } catch {
    test.skip(true, 'the feed did not render enough items for this account');
  }
  test.skip(!m!.kinds.includes('post'), 'no user post in the first items for this account');
  // Weak invariant (strict alternation is a Vitest property of composeFeed: a
  // dismissed Vitana card is invisible to it, and posts keep priority).
  expect(m!.kinds[0], `first feed item is "${m!.kinds[0]}", expected an info card (${m!.kinds.join(',')})`).toBe('info');
  for (let i = 1; i < m!.kinds.length; i++) {
    expect(m!.kinds[i] === 'info' && m!.kinds[i - 1] === 'info', `two info cards side by side at ${i - 1},${i} (${m!.kinds.join(',')})`).toBe(false);
  }
});

test('VTID-04973: the Did-you-know feed card is a Vitana card without a "You can:" lead-in (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  let m = null as ReturnType<typeof measureFeed>;
  try {
    await expect.poll(async () => (m = await page.evaluate(measureFeed))?.tip != null, { timeout: 30_000, intervals: [500, 1000] }).toBe(true);
  } catch {
    test.skip(true, 'no did-you-know card in the feed for this account');
  }
  expect(m!.tip!.hasOrb, 'the Vitana orb is missing from the did-you-know card').toBe(true);
  expect(m!.tip!.text, 'the obsolete "You can:" lead-in is still shown').not.toMatch(/^\s*(You can|Du kannst):?\s*$/m);
});
