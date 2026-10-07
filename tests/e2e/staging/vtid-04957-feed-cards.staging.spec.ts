// VTID-04957 — lavender restyle of the News feed's "New in the community" and
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

// The feed re-renders its cards while the profile lookups settle, so a card found
// a moment ago can already be a detached copy (computed styles of a detached node
// read as ""). Every measurement therefore happens in ONE in-page evaluate that
// queries the live card, and the test polls until it gets a real reading.
const measureMemberCard = () => {
  const el = document.querySelector('[data-testid="new-member-card"]');
  if (!el || !el.isConnected) return null;
  const actual = getComputedStyle(el).backgroundColor;
  if (!actual) return null;
  const probe = document.createElement('div');
  probe.style.background = 'hsl(var(--sys-vitana-card))';
  document.body.appendChild(probe);
  const expected = getComputedStyle(probe).backgroundColor;
  probe.remove();
  const title = el.querySelector('p');
  if (!title) return null;
  const range = document.createRange();
  const tops: number[] = [];
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent ?? '';
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) continue;
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width) tops.push(Math.round(r.top));
    }
  }
  const lastTop = tops[tops.length - 1];
  return {
    actual,
    expected,
    text: title.textContent ?? '',
    lineCount: new Set(tops).size,
    charsOnLastLine: tops.filter((t) => t === lastTop).length,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
};

const measureTipCard = () => {
  const el = document.querySelector('[data-testid="feature-announcement-did-you-know-feature"]');
  if (!el || !el.isConnected) return null;
  const bg = getComputedStyle(el).backgroundColor;
  const eyebrow = el.querySelector('span');
  const fg = eyebrow ? getComputedStyle(eyebrow).color : '';
  return bg && fg ? { bg, fg } : null;
};

for (const size of [
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'Samsung', width: 412, height: 915 },
]) {
  test(`VTID-04957: New-in-the-community card is lavender and its title wraps cleanly (${size.name})`, async ({ page, request }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto('/home', { waitUntil: 'domcontentloaded' });

    let m = null as ReturnType<typeof measureMemberCard>;
    try {
      await expect.poll(async () => (m = await page.evaluate(measureMemberCard)) !== null, { timeout: 25_000, intervals: [500, 1000] }).toBe(true);
    } catch {
      test.skip(true, 'no new-member card in the feed for this account');
    }
    expect(m!.expected, 'probe colour did not resolve').toMatch(/^rgb/);
    // Surface equals the Vitana-recommends card colour (--sys-vitana-card), not grey.
    expect(m!.actual).toBe(m!.expected);
    // Title: no space before closing punctuation, never a lone word / "!" on line two.
    expect(m!.text).not.toMatch(/\s[!?.,:;]/);
    expect(m!.lineCount).toBeLessThanOrEqual(2);
    if (m!.lineCount === 2) expect(m!.charsOnLastLine, 'a lone word or "!" wraps onto its own line').toBeGreaterThan(6);
    expect(m!.overflow, 'horizontal overflow').toBeLessThanOrEqual(0);
  });
}

test('VTID-04957: Did-you-know card is lavender, not amber (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  let m = null as ReturnType<typeof measureTipCard>;
  try {
    await expect.poll(async () => (m = await page.evaluate(measureTipCard)) !== null, { timeout: 25_000, intervals: [500, 1000] }).toBe(true);
  } catch {
    test.skip(true, 'no did-you-know card in the feed for this account');
  }
  const [r, , b] = m!.bg.match(/\d+/g)!.map(Number);
  expect(b, `card background ${m!.bg} is not lavender/blue-tinted`).toBeGreaterThan(r);
  const [er, , eb] = m!.fg.match(/\d+/g)!.map(Number);
  expect(eb, `eyebrow ${m!.fg} is amber`).toBeGreaterThan(er);
});
