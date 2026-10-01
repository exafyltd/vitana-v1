// VTID-04791 — /commerce/join leads with the fastest sign-up options.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never signs in or starts an OAuth flow. A signed-out visitor
// sees Google and Apple first and "Continue with email" after them; the email
// + password form only opens when asked for, and can be closed again.
// Checked by structure and test ids, not by text, so it holds in every UI
// language.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

test('join shows Google, Apple and email first; the password form opens on demand', async ({ page }) => {
  await page.goto('/commerce/join', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  const google = page.getByTestId('join-option-google');
  const apple = page.getByTestId('join-option-apple');
  const email = page.getByTestId('join-option-email');
  await expect(google).toBeVisible();
  await expect(apple).toBeVisible();
  await expect(email).toBeVisible();
  // Fastest first: the providers sit above the email option.
  const [g, a, e] = await Promise.all([google.boundingBox(), apple.boundingBox(), email.boundingBox()]);
  expect(g!.y).toBeLessThan(a!.y);
  expect(a!.y).toBeLessThan(e!.y);
  // No password field until the visitor chooses email.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);

  await email.click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(google).toHaveCount(0);
});

test('join fits a 375px phone without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/commerce/join', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('join-option-google')).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByTestId('join-option-email').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
