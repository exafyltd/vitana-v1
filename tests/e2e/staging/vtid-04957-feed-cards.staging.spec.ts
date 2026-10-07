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
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary)|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
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

for (const size of [
  { name: 'iPhone', width: 390, height: 844 },
  { name: 'Samsung', width: 412, height: 915 },
]) {
  test(`VTID-04957: New-in-the-community card is lavender and its title wraps cleanly (${size.name})`, async ({ page, request }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto('/home', { waitUntil: 'domcontentloaded' });

    const card = page.getByTestId('new-member-card').first();
    const present = await card.waitFor({ state: 'visible', timeout: 25_000 }).then(() => true, () => false);
    test.skip(!present, 'no new-member card in the feed for this account');

    // Surface equals the Vitana-recommends card colour (--sys-vitana-card), not grey.
    const colours = await card.evaluate((el) => {
      const probe = document.createElement('div');
      probe.style.background = 'hsl(var(--sys-vitana-card))';
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { actual: getComputedStyle(el).backgroundColor, expected };
    });
    expect(colours.actual).toBe(colours.expected);

    // Title: no space before "!" and the last word never sits alone on a line.
    const title = card.locator('p').first();
    const text = (await title.textContent()) ?? '';
    expect(text).not.toMatch(/\s[!?.,:;]/);
    const lines = await title.evaluate((el) => {
      const range = document.createRange();
      const rects: number[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const s = n.textContent ?? '';
        for (let i = 0; i < s.length; i++) {
          if (/\s/.test(s[i])) continue;
          range.setStart(n, i);
          range.setEnd(n, i + 1);
          const r = range.getBoundingClientRect();
          if (r.width) rects.push(Math.round(r.top));
        }
      }
      const tops = [...new Set(rects)];
      const lastLine = rects.filter((t) => t === rects[rects.length - 1]).length;
      return { lineCount: tops.length, charsOnLastLine: lastLine };
    });
    expect(lines.lineCount).toBeLessThanOrEqual(2);
    if (lines.lineCount === 2) expect(lines.charsOnLastLine, 'a lone word or "!" wraps onto its own line').toBeGreaterThan(6);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(0);
  });
}

test('VTID-04957: Did-you-know card is lavender, not amber (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  const card = page.getByTestId('feature-announcement-did-you-know-feature').first();
  const present = await card.waitFor({ state: 'visible', timeout: 25_000 }).then(() => true, () => false);
  test.skip(!present, 'no did-you-know card in the feed for this account');

  const [r, g, b] = (await card.evaluate((el) => getComputedStyle(el).backgroundColor)).match(/\d+/g)!.map(Number);
  expect(b, `card background rgb(${r},${g},${b}) is not lavender/blue-tinted`).toBeGreaterThan(r);
  const eyebrow = await card.locator('span').first().evaluate((el) => getComputedStyle(el).color);
  const [er, , eb] = eyebrow.match(/\d+/g)!.map(Number);
  expect(eb, `eyebrow ${eyebrow} is amber`).toBeGreaterThan(er);
});
