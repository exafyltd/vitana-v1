// VTID-04793 — a supplier with no business starts registering right away:
// two steps (what the business offers, then name / website / country), the
// short name is never asked for, Back keeps what was entered, and a reload
// resumes where the supplier stopped.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never presses "Create supplier account" — the test user has no
// business, so /commerce opens the registration sheet by itself. Only local
// clicks and typing; the draft lives in this browser's localStorage and is
// removed at the end.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
test('first-time supplier: registration opens by itself, two steps, no short-name field, resumes after reload', async ({ page, request }) => {
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

  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });

  // Step 1: the sheet is already open, with the seven categories.
  const next = page.getByTestId('register-next');
  await expect(next).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid^="register-category-"]')).toHaveCount(7);
  await expect(next).toBeDisabled();
  await page.getByTestId('register-category-fitness_wellness').click();
  await next.click();

  // Step 2: name, website, country — and no short-name field.
  await expect(page.locator('#ro-name')).toBeVisible();
  await expect(page.locator('#ro-website')).toBeVisible();
  await expect(page.locator('#ro-country')).toBeVisible();
  await expect(page.locator('input.font-mono')).toHaveCount(0);
  await page.locator('#ro-name').fill('Staging Read Only Check');
  await page.locator('#ro-country').selectOption('DE');
  await expect(page.getByTestId('register-create')).toBeEnabled();

  // A bad website blocks the button until it is fixed or cleared.
  await page.locator('#ro-website').fill('not a site');
  await expect(page.getByTestId('register-create')).toBeDisabled();
  await page.locator('#ro-website').fill('');

  // Back keeps the category; a reload resumes on step 2 with the name kept.
  await page.getByTestId('register-back').click();
  await expect(page.getByTestId('register-category-fitness_wellness')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('register-next').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => sessionStorage.removeItem('vitana.commerce.autoRegisterShown'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#ro-name')).toHaveValue('Staging Read Only Check', { timeout: 30_000 });

  await page.evaluate(() => localStorage.removeItem('vitana.commerce.registerDraft'));
});

test('mobile 375px: the registration sheet fits without horizontal scroll', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.setViewportSize({ width: 375, height: 812 });
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
  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('register-next')).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByTestId('register-category-health_medical').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
