// VTID-04809 — Buy Credits no longer offers client-granted "bonus" credits.
//
// Members can no longer add credits to their own wallet (the database refuses
// update_user_balance 'add'); the popup used to grant itself "+N Bonus".
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user, opens /wallet, opens Buy Credits and
// reads the package list. It buys nothing.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('Buy Credits lists packages without bonus credits', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
  const bundle = await (await request.get(anon)).text();
  // The anon key is the JWT in the bundle whose payload names this project and role anon.
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

  await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
  // Desktop shows "Buy Credits"; the mobile quick action shows "VTNA Credits kaufen".
  const open = page.getByText(/^(VTNA )?(Credits kaufen|Buy (VTNA )?Credits)$/).first();
  await expect(open).toBeVisible({ timeout: 45_000 });
  await open.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/^500 Credits$/)).toBeVisible();
  await expect(dialog.getByText(/^2[.,]500 Credits$/)).toBeVisible();
  await expect(dialog).not.toContainText('Bonus');
});
