// VTID-04836 — the earthlinks tenant is retired (merged into Maxina, platform
// VTID-01985). Old links must not break: every /earthlinks URL lands on the
// Maxina equivalent with the rest of the path and the query kept.
//
// Read-only and signed out: './staging-guard' (copied in by the runner) aborts
// every write. Only GET page loads; no sign-in, no form is submitted.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites: / https:\/\/preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)/,
});

test('the old Earthlinks portal link lands on the Maxina portal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/earthlinks', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/maxina(\?|$)/, { timeout: 30_000 });
  expect(new URL(page.url()).pathname).not.toContain('earthlinks');
  expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('an Earthlinks sign-in link keeps its query on Maxina', async ({ page }) => {
  await page.goto('/earthlinks?redirectTo=%2Fhome', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/maxina\?redirectTo=%2Fhome$/, { timeout: 30_000 });
});
