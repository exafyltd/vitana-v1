// VTID-04979 — Profile → Social tab: brand-coloured social logos and the "+"
// channel picker (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The only clicks open and close UI (the
// "+" and the picker's backdrop) — no channel is picked, no dialog is opened,
// nothing is imported or saved. Phone viewport 390x844.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/(get_role_preference|get_my_permitted_roles|list_roles_for_active_tenant|get_profile_health_summary|get_user_profile_by_identifier)|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const CHANNELS = ['linkedin', 'instagram', 'x', 'tiktok', 'youtube', 'facebook'];

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

test('VTID-04979: Social tab shows full-colour logos and "+" opens the channel picker (phone)', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, request);
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/me/profile?card=back', { waitUntil: 'domcontentloaded' });

  const add = page.getByTestId('social-add-channel');
  await expect(add, 'the "+" add-channel button is missing on the Social tab').toBeVisible({ timeout: 25_000 });

  // Every logo in the connect row renders in colour: no grayscale filter and no
  // dimming on the tile or anything inside it.
  const row = await page.evaluate((ids) =>
    ids
      .map((id) => document.querySelector(`[data-testid="social-connect-${id}"]`))
      .filter((el): el is HTMLElement => !!el)
      .map((el) => {
        const nodes = [el, ...el.querySelectorAll('*')] as HTMLElement[];
        return {
          id: el.dataset.testid,
          bg: getComputedStyle(el).backgroundColor,
          greyed: nodes.some((n) => /grayscale/.test(getComputedStyle(n).filter) || Number(getComputedStyle(n).opacity) < 0.9),
        };
      }),
  CHANNELS);
  for (const tile of row) {
    expect(tile.greyed, `${tile.id} is still greyed out`).toBe(false);
  }
  const tiktok = row.find((t) => t.id === 'social-connect-tiktok');
  if (tiktok) expect(tiktok.bg, 'TikTok tile is not black').toBe('rgb(0, 0, 0)');

  // "+" opens the picker listing every channel. Nothing is picked.
  await add.click();
  const picker = page.getByTestId('social-channel-picker');
  await expect(picker).toBeVisible();
  for (const id of CHANNELS) {
    await expect(page.getByTestId(`social-channel-option-${id}`)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden({ timeout: 5_000 });
});
