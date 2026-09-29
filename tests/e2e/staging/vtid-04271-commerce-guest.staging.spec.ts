// VTID-04271 — /commerce is open to signed-out visitors.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write,
// and this spec never signs in. A guest opening /commerce must see the
// portal itself (not be bounced to a login screen): a headline, and a single
// sign-up call to action that leads to /commerce/join and back. Checked by
// structure and route, not by text, so it holds in every UI language.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

test('a signed-out visitor sees the Commerce Portal and one sign-up path', async ({ page }) => {
  await page.goto('/commerce', { waitUntil: 'domcontentloaded' });

  const heading = page.locator('main h1, h1').first();
  await expect(heading).toBeVisible({ timeout: 30_000 });
  await expect(heading).not.toHaveText('');
  // Still on the portal: a guest is no longer sent to a login screen.
  expect(new URL(page.url()).pathname).toMatch(/\/commerce\/?$/);

  // The guest hero has exactly one call to action; it leads to the join flow
  // and brings the visitor back to /commerce afterwards.
  const cta = heading.locator('xpath=ancestor::section[1]').getByRole('button');
  await expect(cta).toHaveCount(1);
  await cta.click();
  await expect(page).toHaveURL(/\/commerce\/join\?redirectTo=%2Fcommerce/);
});
